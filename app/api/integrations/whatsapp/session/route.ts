/**
 * POST — inicia sessão QR (Evolution GO)
 * GET  — polling de status + QR
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
  resolveCrmWebhookUrl,
  startGoWhatsAppSession,
} from "@/lib/integrations/evolution-go-client";
import { provisionIntegration } from "@/lib/integrations/provision-integration";
import { parseWhatsAppCredentials } from "@/lib/integrations/connection-state";

const SIMULATED = isEvolutionGoSimulated();

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "integrations")) return forbidden();

  try {
    const instanceName = evolutionInstanceName(session.tenantId);
    const webhookUrl = resolveCrmWebhookUrl();

    await provisionIntegration({
      tenantId: session.tenantId,
      channelType: "whatsapp",
      provider: "evolution",
      credentials: {
        provider: "evolution",
        evolutionApiVersion: "go",
        evolutionInstanceName: instanceName,
        connectionState: "generating_qr",
      },
      isActive: true,
    });

    const evo = await startGoWhatsAppSession({
      instanceName,
      webhookUrl,
    });

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
        connectionState: "awaiting_scan",
        lastQrAt: new Date().toISOString(),
        ...(evo.qrCodeBase64 ? { lastQrCodeBase64: evo.qrCodeBase64 } : {}),
      },
    });

    return NextResponse.json({
      data: {
        instanceName,
        instanceId: evo.instanceId,
        state: "awaiting_scan",
        qrCodeBase64: evo.qrCodeBase64 ?? null,
        pairingCode: evo.pairingCode ?? null,
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

  // Modo demo: auto-conectar após ~5s
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
      const phone = evo.phoneNumber ?? creds.phoneNumber ?? "";
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
      (await refreshGoQrCode(creds.instanceToken)) ??
      creds.lastQrCodeBase64 ??
      null;

    return NextResponse.json({
      data: {
        state: creds.connectionState === "generating_qr" ? "generating_qr" : "awaiting_scan",
        qrCodeBase64,
        instanceName,
        instanceId,
        simulated: false,
      },
    });
  }

  const qrCodeBase64 = creds.lastQrCodeBase64 ?? null;

  return NextResponse.json({
    data: {
      state: creds.connectionState === "generating_qr" ? "generating_qr" : "awaiting_scan",
      qrCodeBase64,
      instanceName,
      instanceId,
      simulated: SIMULATED,
    },
  });
}
