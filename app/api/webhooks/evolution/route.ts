/**
 * POST /api/webhooks/evolution
 * Evolution GO (+ compat legado Evolution API v2)
 */

import { NextRequest, NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/webhooks/process-inbound";
import { ingestWebhook } from "@/lib/webhooks/ingest";
import { parseEvolutionGoWebhook } from "@/lib/webhooks/parse-evolution-go-payload";
import {
  findTenantByEvolutionInstance,
  syncIntegrationFromGoEvent,
} from "@/lib/integrations/sync-evolution-go-integration";
import { verifyEvolutionWebhookRequest } from "@/lib/integrations/evolution-webhook-auth";
import { evolutionLog } from "@/lib/integrations/evolution-logger";
import { logIntegrationEvent } from "@/lib/integrations/integration-events";
import { prisma } from "@/lib/db/client";

export async function GET() {
  return NextResponse.json({ status: "evolution-go-webhook-ready" });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    evolutionLog.warn("webhook", "JSON inválido");
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = parseEvolutionGoWebhook(body);

  const instanceName =
    parsed.instanceName ??
    (typeof (body as Record<string, unknown>).instance === "string"
      ? String((body as Record<string, unknown>).instance)
      : undefined);

  const instanceKey = parsed.instanceId ?? instanceName;

  if (!instanceKey && parsed.kind === "ignored") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const resolved = await findTenantByEvolutionInstance(parsed.instanceId, instanceName);

  let storedInstanceToken: string | undefined;
  if (resolved) {
    const row = await prisma.integration.findUnique({
      where: { id: resolved.integrationId },
      select: { credentials: true },
    });
    storedInstanceToken = (row?.credentials as Record<string, string> | undefined)?.instanceToken;
  }

  const auth = verifyEvolutionWebhookRequest(req, {
    instanceTokenFromPayload: parsed.instanceToken,
    storedInstanceToken,
  });

  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  evolutionLog.info("webhook", "evento recebido", {
    event: parsed.rawEvent ?? parsed.kind,
    instanceId: parsed.instanceId,
    auth: auth.method,
  });

  if (!resolved) {
    evolutionLog.warn("webhook", "integração não encontrada", {
      instanceId: parsed.instanceId,
      instanceName,
      event: parsed.rawEvent,
    });
    return NextResponse.json(
      { error: "Integration not found for instance." },
      { status: 404 },
    );
  }

  const { tenantId, integrationId } = resolved;

  try {
    if (parsed.kind === "qrcode" || parsed.kind === "connected" || parsed.kind === "disconnected") {
      await syncIntegrationFromGoEvent(tenantId, parsed);
      if (parsed.kind === "connected") {
        void logIntegrationEvent({
          tenantId,
          integrationId,
          action: "evolution_connected",
          summary: `Webhook: ${parsed.rawEvent ?? "connected"}`,
        });
      }
      if (parsed.kind === "disconnected") {
        void logIntegrationEvent({
          tenantId,
          integrationId,
          action: "evolution_disconnected",
          summary: `Webhook: ${parsed.rawEvent ?? "disconnected"}`,
        });
      }
      return NextResponse.json({ ok: true, lifecycle: parsed.kind });
    }

    if (parsed.kind !== "message" || !parsed.content || !parsed.senderPhone) {
      if (parsed.kind === "ignored" && parsed.rawEvent) {
        evolutionLog.info("webhook", "evento ignorado", {
          event: parsed.rawEvent,
          reason: parsed.skipReason,
        });
      }
      return NextResponse.json({
        ok: true,
        skipped: parsed.rawEvent ?? "ignored",
        reason: parsed.skipReason,
      });
    }

    const result = await ingestWebhook({
      tenantId,
      integrationId,
      channel: "whatsapp",
      payload: body,
      process: () =>
        processInboundMessage({
          tenantId,
          channel: "whatsapp",
          senderPhone: parsed.senderPhone!,
          senderName: parsed.senderName,
          content: parsed.content!,
          externalMessageId: parsed.externalMessageId,
          groupJid: parsed.groupJid,
          fromMe: parsed.fromMe,
          timestamp: new Date(),
        }),
    });

    void logIntegrationEvent({
      tenantId,
      integrationId,
      action: "evolution_webhook_ok",
      summary: `Mensagem ${result.duplicate ? "duplicada" : "processada"}`,
      detail: result.conversationId,
    });

    return NextResponse.json({
      ok: true,
      processed: true,
      conversationId: result.conversationId,
      duplicate: result.duplicate ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "processing error";
    evolutionLog.error("webhook", "falha no processamento", { message, tenantId });
    void logIntegrationEvent({
      tenantId,
      integrationId,
      action: "evolution_webhook_fail",
      summary: message,
    });
    // 500 → Evolution GO reentrega o webhook (retry automático do GO)
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
