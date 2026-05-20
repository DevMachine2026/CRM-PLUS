/**
 * POST /api/webhooks/evolution
 * Evolution GO (+ compat legado Evolution API v2)
 */

import { NextRequest, NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/webhooks/process-inbound";
import { ingestWebhook, enqueueWebhookProcessing } from "@/lib/webhooks/ingest";
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

  const instanceKey =
    parsed.instanceId ??
    (typeof (body as Record<string, unknown>).instance === "string"
      ? String((body as Record<string, unknown>).instance)
      : undefined);

  if (!instanceKey && parsed.kind === "ignored") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const resolved = await findTenantByEvolutionInstance(
    parsed.instanceId,
    typeof (body as Record<string, unknown>).instance === "string"
      ? String((body as Record<string, unknown>).instance)
      : undefined,
  );

  if (!resolved) {
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
    return NextResponse.json({ ok: true, skipped: parsed.rawEvent ?? "ignored" });
  }

  enqueueWebhookProcessing(async () => {
    await ingestWebhook({
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
          timestamp: new Date(),
        }),
    });
  });

  return NextResponse.json({ ok: true, queued: true });
}
