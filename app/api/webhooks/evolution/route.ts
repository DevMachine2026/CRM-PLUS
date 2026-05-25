/**
 * POST /api/webhooks/evolution
 * Evolution GO (+ compat legado Evolution API v2)
 */

import { NextRequest, NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/webhooks/process-inbound";
import { ingestWebhook } from "@/lib/webhooks/ingest";
import { checkRateLimit, WEBHOOK_LIMIT } from "@/lib/rate-limit";
import { parseEvolutionGoWebhook } from "@/lib/webhooks/parse-evolution-go-payload";
import {
  findTenantByEvolutionInstance,
  syncIntegrationFromGoEvent,
} from "@/lib/integrations/sync-evolution-go-integration";

export async function GET() {
  return NextResponse.json({ status: "evolution-go-webhook-ready" });
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, WEBHOOK_LIMIT);
  if (limited) return limited;

  const rawBody = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
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

  if (!resolved) {
    console.warn("[webhook/evolution] integration not found", {
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

  if (parsed.kind === "qrcode" || parsed.kind === "connected") {
    await syncIntegrationFromGoEvent(tenantId, parsed);
    return NextResponse.json({ ok: true, lifecycle: parsed.kind });
  }

  if (parsed.kind !== "message" || !parsed.content || !parsed.senderPhone) {
    if (parsed.kind === "ignored" && parsed.rawEvent) {
      console.warn("[webhook/evolution] skipped", {
        event: parsed.rawEvent,
        reason: parsed.skipReason,
        instanceId: parsed.instanceId,
        instanceName: parsed.instanceName,
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

  return NextResponse.json({
    ok: true,
    processed: true,
    conversationId: result.conversationId,
    duplicate: result.duplicate ?? false,
  });
}
