/**
 * Evolution GO — envio outbound de texto.
 * @see https://docs.evolutionfoundation.com.br/en/evolution-go/send-a-text-message
 */

import { getEvolutionApiUrl } from "@/lib/integrations/evolution-config";
import { isEvolutionGoSimulated } from "@/lib/integrations/evolution-go-client";
import { fetchEvolutionGo } from "@/lib/integrations/http-resilience";
import { evolutionLog } from "@/lib/integrations/evolution-logger";
import { logIntegrationEvent } from "@/lib/integrations/integration-events";

const BASE = getEvolutionApiUrl();

export interface GoSendResult {
  externalId: string | null;
  externalStatus: "sent" | "failed" | "simulated";
  deliveryError?: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function classifySendError(status: number, message: string): string {
  if (status === 401 || status === 403) return "Credenciais inválidas (apikey).";
  if (status === 429) return "Rate limit no Evolution GO — tente novamente.";
  if (status === 404) return "Instância não encontrada no Evolution GO.";
  if (/disconnect|not connected|logged out/i.test(message)) {
    return "WhatsApp desconectado — reconecte em Integrações.";
  }
  return message;
}

/**
 * Envia texto via POST /send/text (apikey = instance token).
 */
export async function sendEvolutionGoTextMessage(
  to: string,
  text: string,
  instanceToken: string,
  options?: { tenantId?: string; integrationId?: string },
): Promise<GoSendResult> {
  const number = normalizePhone(to);
  if (!number) {
    return {
      externalId: null,
      externalStatus: "failed",
      deliveryError: "Número de telefone inválido.",
    };
  }

  if (!BASE || isEvolutionGoSimulated() || instanceToken.startsWith("sim-")) {
    return { externalId: `sim-go-${Date.now()}`, externalStatus: "simulated" };
  }

  try {
    const res = await fetchEvolutionGo(
      `${BASE}/send/text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: instanceToken,
        },
        body: JSON.stringify({ number, text }),
      },
      { label: "send/text", attempts: 3, timeoutMs: 30_000 },
    );

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const err = json.error as Record<string, unknown> | undefined;
      const raw =
        (typeof err?.message === "string" && err.message) ||
        (typeof json.message === "string" && json.message) ||
        `HTTP ${res.status}`;
      const msg = classifySendError(res.status, raw);
      evolutionLog.warn("send", "falha no envio", { status: res.status, number: number.slice(-4) });
      if (options?.tenantId) {
        void logIntegrationEvent({
          tenantId: options.tenantId,
          integrationId: options.integrationId,
          action: "evolution_send_fail",
          summary: msg,
          detail: `to=***${number.slice(-4)} status=${res.status}`,
        });
      }
      return { externalId: null, externalStatus: "failed", deliveryError: msg };
    }

    const data = json.data as Record<string, unknown> | undefined;
    const info = data?.Info as Record<string, unknown> | undefined;
    const externalId =
      (typeof json.messageId === "string" ? json.messageId : undefined) ??
      (typeof info?.ID === "string" ? info.ID : undefined) ??
      null;

    evolutionLog.info("send", "mensagem enviada", { hasId: Boolean(externalId) });
    if (options?.tenantId) {
      void logIntegrationEvent({
        tenantId: options.tenantId,
        integrationId: options.integrationId,
        action: "evolution_send_ok",
        summary: "Mensagem enviada via Evolution GO",
        detail: externalId ?? undefined,
      });
    }

    return { externalId, externalStatus: "sent" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "network error";
    evolutionLog.error("send", "erro de rede", { message: msg });
    if (options?.tenantId) {
      void logIntegrationEvent({
        tenantId: options.tenantId,
        integrationId: options.integrationId,
        action: "evolution_send_fail",
        summary: msg,
      });
    }
    return {
      externalId: null,
      externalStatus: "failed",
      deliveryError: classifySendError(0, msg),
    };
  }
}
