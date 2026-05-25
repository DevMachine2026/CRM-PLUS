/**
 * POST — inicia sessão WhatsApp (QR ou código de pareamento)
 * GET  — polling de status + QR/código
 */

import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import {
  evolutionInstanceName,
  getGoConnectionState,
  isEvolutionGoSimulated,
  refreshGoQrCode,
} from "@/lib/integrations/evolution-go-client";
import { startWhatsAppConnectSession } from "@/lib/integrations/evolution-go/session";
import type { GoConnectRequest } from "@/lib/integrations/evolution-go/types";
import { provisionIntegration } from "@/lib/integrations/provision-integration";
import { parseWhatsAppCredentials } from "@/lib/integrations/connection-state";

const SIMULATED = isEvolutionGoSimulated();

function parseConnectBody(raw: unknown): GoConnectRequest {
  if (!raw || typeof raw !== "object") return { method: "qr" };
  const b = raw as Record<string, unknown>;
  return {
    method: b.method === "pairing" ? "pairing" : "qr",
    phone: typeof b.phone === "string" ? b.phone : undefined,
    reset: b.reset === true,
  };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "integrations")) return forbidden();

  try {
    const body = parseConnectBody(await req.json().catch(() => ({})));
    const instanceName = evolutionInstanceName(session.tenantId);
    const awaitingState =
      body.method === "pairing" ? ("awaiting_pairing" as const) : ("awaiting_scan" as const);

    await provisionIntegration({
      tenantId: session.tenantId,
      channelType: "whatsapp",
      provider: "evolution",
      credentials: {
        provider: "evolution",
        evolutionApiVersion: "go",
        evolutionInstanceName: instanceName,
        connectionState: "generating_qr",
        connectMethod: body.method ?? "qr",
        ...(body.phone ? { targetPhone: body.phone.replace(/\D/g, "") } : {}),
      },
      isActive: true,
    });

    const evo = await startWhatsAppConnectSession(instanceName, body);

    await provisionIntegration({
      tenantId: session.tenantId,
      channelType: "whatsapp",
      provider: "evolution",
      credentials: {
        provider: "evolution",
        evolutionApiVersion: "go",
        evolutionInstanceName: instanceName,
        evolutionInstanceId: evo.instanceId,
        instanceToken: evo.instanceToken,
        connectionState: awaitingState,
        connectMethod: evo.method,
        ...(evo.targetPhone ? { targetPhone: evo.targetPhone } : {}),
        lastQrAt: new Date().toISOString(),
        ...(evo.qrCodeBase64 ? { lastQrCodeBase64: evo.qrCodeBase64 } : {}),
        ...(evo.pairingCode ? { lastPairingCode: evo.pairingCode } : {}),
      },
    });

    return NextResponse.json({
      data: {
        instanceName,
        instanceId: evo.instanceId,
        state: awaitingState,
        method: evo.method,
        qrCodeBase64: evo.qrCodeBase64 ?? null,
        pairingCode: evo.pairingCode ?? null,
        targetPhone: evo.targetPhone ?? null,
        simulated: SIMULATED,
      },
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Não foi possível iniciar a conexão WhatsApp.";
    console.error("[whatsapp/session POST]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "integrations")) return forbidden();

  const row = await prisma.integration.findFirst({
    where: { tenantId: session.tenantId, channelType: "whatsapp", name: "Principal" },
    select: { id: true, credentials: true, webhookUrl: true },
  });

  const creds = parseWhatsAppCredentials(row?.credentials);
  const instanceName = creds.evolutionInstanceName ?? evolutionInstanceName(session.tenantId);
  const instanceId = creds.evolutionInstanceId;

  if (creds.connectionState === "connected" && creds.phoneNumber) {
    return NextResponse.json({
      data: {
        state: "connected",
        phoneNumber: creds.phoneNumber,
        instanceName,
        instanceId,
      },
    });
  }

  if (
    SIMULATED &&
    creds.connectionState === "awaiting_scan" &&
    creds.lastQrAt &&
    Date.now() - new Date(creds.lastQrAt).getTime() > 5000
  ) {
    const simId = instanceId ?? `sim-${instanceName}`;
    await provisionIntegration({
      tenantId: session.tenantId,
      channelType: "whatsapp",
      provider: "evolution",
      credentials: {
        provider: "evolution",
        evolutionApiVersion: "go",
        evolutionInstanceName: instanceName,
        evolutionInstanceId: simId,
        connectionState: "connected",
        phoneNumber: "5511999990000",
        phoneNumberId: simId,
        instanceToken: `sim-${instanceName}`,
      },
      isActive: true,
    });
    return NextResponse.json({
      data: {
        state: "connected",
        phoneNumber: "5511999990000",
        instanceName,
        instanceId: simId,
        simulated: true,
      },
    });
  }

  if (!SIMULATED && instanceId && creds.instanceToken) {
    const evo = await getGoConnectionState(creds.instanceToken, instanceId);

    if (evo.state === "open") {
      const phone = evo.phoneNumber ?? creds.phoneNumber ?? creds.targetPhone ?? "";
      await provisionIntegration({
        tenantId: session.tenantId,
        channelType: "whatsapp",
        provider: "evolution",
        credentials: {
          provider: "evolution",
          evolutionApiVersion: "go",
          evolutionInstanceName: instanceName,
          evolutionInstanceId: instanceId,
          connectionState: "connected",
          phoneNumber: phone,
          phoneNumberId: instanceId,
          instanceToken: creds.instanceToken ?? "",
        },
        isActive: true,
      });

      return NextResponse.json({
        data: { state: "connected", phoneNumber: phone, instanceName, instanceId },
      });
    }

    const qrCodeBase64 =
      creds.connectMethod === "qr"
        ? ((await refreshGoQrCode(creds.instanceToken)) ?? creds.lastQrCodeBase64 ?? null)
        : null;

    const pendingState =
      creds.connectionState === "awaiting_pairing"
        ? "awaiting_pairing"
        : creds.connectionState === "generating_qr"
          ? "generating_qr"
          : "awaiting_scan";

    return NextResponse.json({
      data: {
        state: pendingState,
        qrCodeBase64,
        pairingCode: creds.lastPairingCode ?? null,
        targetPhone: creds.targetPhone ?? null,
        method: creds.connectMethod ?? "qr",
        instanceName,
        instanceId,
        simulated: false,
      },
    });
  }

  return NextResponse.json({
    data: {
      state: creds.connectionState === "generating_qr" ? "generating_qr" : "awaiting_scan",
      qrCodeBase64: creds.lastQrCodeBase64 ?? null,
      pairingCode: creds.lastPairingCode ?? null,
      instanceName,
      instanceId,
      simulated: SIMULATED,
    },
  });
}
