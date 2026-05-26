/**
 * Saúde da integração Evolution GO (API + sessão WhatsApp por tenant).
 */

import { prisma } from "@/lib/db/client";
import {
  getGoConnectionState,
  isEvolutionGoSimulated,
  resolveGoInstanceByName,
} from "@/lib/integrations/evolution-go-client";
import {
  getEvolutionApiKey,
  getEvolutionApiUrl,
  isEvolutionConfigured,
} from "@/lib/integrations/evolution-config";
import { getCircuitStatus, fetchEvolutionGo } from "@/lib/integrations/http-resilience";
import { parseWhatsAppCredentials } from "@/lib/integrations/connection-state";
import type { ChannelConnectionState } from "@/lib/integrations/connection-state";
import { evolutionLog } from "@/lib/integrations/evolution-logger";
import { logIntegrationEvent } from "@/lib/integrations/integration-events";

export type EvolutionServiceHealth = {
  configured: boolean;
  simulated: boolean;
  apiReachable: boolean;
  apiKeyConfigured: boolean;
  circuit: { state: string; failures: number };
  latencyMs?: number;
  error?: string;
};

export type TenantWhatsAppHealth = {
  tenantId: string;
  integrationId?: string;
  uiState: ChannelConnectionState;
  goState: "open" | "connecting" | "disconnected" | "close" | "simulated";
  phoneNumber?: string;
  instanceName?: string;
  instanceId?: string;
  lastCheckedAt: string;
};

export async function checkEvolutionServiceHealth(): Promise<EvolutionServiceHealth> {
  const configured = isEvolutionConfigured();
  const simulated = isEvolutionGoSimulated();
  const circuit = getCircuitStatus();

  if (!configured || simulated) {
    return {
      configured,
      simulated: true,
      apiReachable: false,
      apiKeyConfigured: Boolean(getEvolutionApiKey()),
      circuit,
    };
  }

  const base = getEvolutionApiUrl()!;
  const started = Date.now();
  try {
    const res = await fetchEvolutionGo(
      `${base}/instance/all`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(getEvolutionApiKey() ? { apikey: getEvolutionApiKey() } : {}),
        },
      },
      { label: "health/instance/all", attempts: 2, timeoutMs: 12_000 },
    );
    return {
      configured: true,
      simulated: false,
      apiReachable: res.ok,
      apiKeyConfigured: Boolean(getEvolutionApiKey()),
      circuit,
      latencyMs: Date.now() - started,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unreachable";
    return {
      configured: true,
      simulated: false,
      apiReachable: false,
      apiKeyConfigured: Boolean(getEvolutionApiKey()),
      circuit,
      latencyMs: Date.now() - started,
      error: msg,
    };
  }
}

function mapGoToUi(
  goState: "open" | "connecting" | "disconnected" | "close",
  credsState?: ChannelConnectionState,
): ChannelConnectionState {
  if (goState === "open") return "connected";
  if (goState === "connecting") {
    if (credsState === "awaiting_pairing") return "awaiting_pairing";
    if (credsState === "generating_qr") return "generating_qr";
    return "awaiting_scan";
  }
  if (credsState === "error") return "error";
  return "disconnected";
}

export async function checkTenantWhatsAppHealth(
  tenantId: string,
): Promise<TenantWhatsAppHealth | null> {
  const row = await prisma.integration.findFirst({
    where: { tenantId, channelType: "whatsapp", name: "Principal" },
    select: { id: true, credentials: true },
  });
  if (!row) return null;

  const creds = parseWhatsAppCredentials(row.credentials);
  const instanceName = creds.evolutionInstanceName;
  const instanceId = creds.evolutionInstanceId;
  const instanceToken = creds.instanceToken;

  if (isEvolutionGoSimulated()) {
    return {
      tenantId,
      integrationId: row.id,
      uiState: creds.connectionState === "connected" ? "connected" : "awaiting_scan",
      goState: "simulated",
      phoneNumber: creds.phoneNumber,
      instanceName,
      instanceId,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  if (!instanceToken) {
    return {
      tenantId,
      integrationId: row.id,
      uiState: "disconnected",
      goState: "disconnected",
      instanceName,
      instanceId,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  const session = await getGoConnectionState(instanceToken, instanceId);
  const uiState = mapGoToUi(session.state, creds.connectionState);

  return {
    tenantId,
    integrationId: row.id,
    uiState,
    goState: session.state,
    phoneNumber: session.phoneNumber ?? creds.phoneNumber,
    instanceName,
    instanceId,
    lastCheckedAt: new Date().toISOString(),
  };
}

/** Cron: reconcilia estado salvo com Evolution GO para todos os tenants ativos. */
export async function runEvolutionHealthCron(): Promise<{
  service: EvolutionServiceHealth;
  tenants: { tenantId: string; uiState: string; updated: boolean }[];
}> {
  const service = await checkEvolutionServiceHealth();
  evolutionLog.info("health-cron", "service check", {
    reachable: service.apiReachable,
    circuit: service.circuit.state,
  });

  const allWa = await prisma.integration.findMany({
    where: { channelType: "whatsapp", isActive: true },
    select: { id: true, tenantId: true, credentials: true },
  });
  const integrations = allWa.filter((row) => {
    const p = (row.credentials as Record<string, string>)?.provider;
    return p === "evolution";
  });

  const tenants: { tenantId: string; uiState: string; updated: boolean }[] = [];

  for (const row of integrations) {
    const creds = parseWhatsAppCredentials(row.credentials);
    if (!creds.instanceToken || isEvolutionGoSimulated()) continue;

    const session = await getGoConnectionState(creds.instanceToken, creds.evolutionInstanceId);
    const uiState = mapGoToUi(session.state, creds.connectionState);
    let updated = false;

    if (session.state === "open" && session.phoneNumber) {
      const phone = session.phoneNumber.replace(/\D/g, "");
      if (creds.connectionState !== "connected" || creds.phoneNumber !== phone) {
        await prisma.integration.update({
          where: { id: row.id },
          data: {
            credentials: {
              ...(row.credentials as object),
              connectionState: "connected",
              phoneNumber: phone,
            },
          },
        });
        updated = true;
        await logIntegrationEvent({
          tenantId: row.tenantId,
          integrationId: row.id,
          action: "evolution_connected",
          summary: `WhatsApp conectado +${phone}`,
        });
      }
    } else if (
      session.state === "disconnected" &&
      creds.connectionState === "connected"
    ) {
      await prisma.integration.update({
        where: { id: row.id },
        data: {
          credentials: {
            ...(row.credentials as object),
            connectionState: "disconnected",
          },
        },
      });
      updated = true;
      await logIntegrationEvent({
        tenantId: row.tenantId,
        integrationId: row.id,
        action: "evolution_disconnected",
        summary: "Sessão WhatsApp desconectada no Evolution GO",
      });
    }

    tenants.push({ tenantId: row.tenantId, uiState, updated });
  }

  if (service.apiReachable) {
    await logIntegrationEvent({
      tenantId: integrations[0]?.tenantId ?? "system",
      action: "evolution_health_ok",
      summary: `Evolution API ok (${service.latencyMs}ms)`,
    }).catch(() => {});
  }

  return { service, tenants };
}

/** Verifica se GLOBAL_API_KEY está alinhada (401/403 vs ok). */
export async function verifyEvolutionApiKeyAlignment(): Promise<boolean> {
  if (!isEvolutionConfigured() || !getEvolutionApiKey()) return false;
  const base = getEvolutionApiUrl()!;
  try {
    const res = await fetchEvolutionGo(
      `${base}/instance/all`,
      { method: "GET", headers: { apikey: getEvolutionApiKey() } },
      { label: "verify-api-key", attempts: 1, timeoutMs: 10_000 },
    );
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}

export async function ensureInstanceExists(instanceName: string): Promise<boolean> {
  const row = await resolveGoInstanceByName(instanceName);
  return Boolean(row);
}
