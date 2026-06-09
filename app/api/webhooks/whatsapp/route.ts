/**
 * POST /api/webhooks/whatsapp
 *
 * WhatsApp webhook receiver (Meta Cloud API + Z-API).
 * - Meta payload: mantém compatibilidade com formato Cloud API.
 * - Z-API payload: parse dedicado + auth por token.
 *
 * ── Simulated payload example ────────────────────────────────────────────────
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{
 *     "id": "WA_BUSINESS_ACCOUNT_ID",
 *     "changes": [{
 *       "field": "messages",
 *       "value": {
 *         "messaging_product": "whatsapp",
 *         "metadata": { "phone_number_id": "PHONE_NUMBER_ID" },
 *         "contacts": [{ "profile": { "name": "João Silva" }, "wa_id": "5511999998888" }],
 *         "messages": [{
 *           "from": "5511999998888",
 *           "id": "wamid.HBgN...",
 *           "timestamp": "1715000000",
 *           "type": "text",
 *           "text": { "body": "Olá, preciso de um orçamento" }
 *         }]
 *       }
 *     }]
 *   }]
 * }
 *
 * ── Tenant routing (simulation only) ─────────────────────────────────────────
 * Pass ?tenantId=<UUID> in the query string.
 * In production, derive tenantId from the phone_number_id ↔ tenant mapping.
 *
 * ── Webhook verification (simulation only) ────────────────────────────────────
 * Meta sends a GET with hub.challenge for endpoint verification.
 * This handler also responds to GET for compatibility with testing tools.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { processInboundMessage } from "@/lib/webhooks/process-inbound";
import { ingestWebhook } from "@/lib/webhooks/ingest";
import { parseZapiWebhook } from "@/lib/webhooks/parse-zapi-payload";
import { isSignatureRequired, getWebhookSecret, verifySignature } from "@/lib/webhooks/verify-signature";
import { checkRateLimit, WEBHOOK_LIMIT } from "@/lib/rate-limit";
import { resolveWhatsAppTenant } from "@/lib/webhooks/resolve-tenant";
import { isValidWebhookVerifyToken } from "@/lib/integrations/verify-webhook-token";
import { verifyZapiWebhookAuth } from "@/lib/integrations/zapi-webhook-auth";

// ── Meta GET verification challenge ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge) {
    const valid = await isValidWebhookVerifyToken("whatsapp", token);
    if (!valid) {
      return NextResponse.json({ error: "Invalid verify token." }, { status: 403 });
    }
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: "whatsapp-webhook-ready" });
}

// ── Payload schema ──────────────────────────────────────────────────────────
const textMessageSchema = z.object({
  from:      z.string(),
  id:        z.string(),
  timestamp: z.string(),
  type:      z.literal("text"),
  text:      z.object({ body: z.string() }),
});

const changeValueSchema = z.object({
  messaging_product: z.literal("whatsapp"),
  metadata: z.object({ phone_number_id: z.string() }).optional(),
  contacts: z.array(z.object({
    profile: z.object({ name: z.string() }).optional(),
    wa_id:   z.string(),
  })).optional(),
  messages: z.array(textMessageSchema).optional(),
});

const waPayloadSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry:  z.array(z.object({
    id:      z.string(),
    changes: z.array(z.object({
      field: z.string(),
      value: changeValueSchema,
    })),
  })),
});

const DEV_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMetaWhatsAppPayload(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  return (body as { object?: string }).object === "whatsapp_business_account";
}

async function resolveZapiTenant(params: {
  instanceId?: string;
  queryTenantId: string | null;
}): Promise<{
  tenantId: string;
  integrationId?: string;
  zapiWebhookToken?: string;
  commercialPhone?: string;
} | null> {
  const { instanceId, queryTenantId } = params;

  if (instanceId) {
    const integrations = await prisma.integration.findMany({
      where: { channelType: "whatsapp", isActive: true },
      select: { id: true, tenantId: true, credentials: true },
    });

    for (const row of integrations) {
      const creds = row.credentials as Record<string, string>;
      if (
        creds.zapiInstanceId === instanceId ||
        creds.instanceId === instanceId ||
        creds.phoneNumberId === instanceId
      ) {
        return {
          tenantId: row.tenantId,
          integrationId: row.id,
          zapiWebhookToken: creds.zapiWebhookToken ?? creds.clientToken,
          commercialPhone: creds.phoneNumber,
        };
      }
    }
  }

  if (process.env.NODE_ENV !== "production" && queryTenantId && DEV_UUID_RE.test(queryTenantId)) {
    return { tenantId: queryTenantId };
  }

  return null;
}

// ── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, WEBHOOK_LIMIT);
  if (limited) return limited;

  const query = new URL(req.url).searchParams;
  const queryTenantId = query.get("tenantId");

  // ── Read body once ───────────────────────────────────────────────────────────
  const rawBody = await req.text();
  const body = (() => { try { return JSON.parse(rawBody); } catch { return null; } })();

  // ── Branch 1: Meta Cloud API payload ────────────────────────────────────────
  if (isMetaWhatsAppPayload(body)) {
    if (isSignatureRequired()) {
      const secret = getWebhookSecret("whatsapp");
      if (!secret) {
        return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
      }
      const sig = req.headers.get("x-hub-signature-256");
      if (!verifySignature(rawBody, sig, secret)) {
        return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
      }
    }

    const parsed = waPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid WhatsApp payload.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // ── Resolve tenantId via integração cadastrada ou ?tenantId fallback ────────
    const phoneNumberId = parsed.data.entry[0]?.changes[0]?.value?.metadata?.phone_number_id;
    const tenantId = await resolveWhatsAppTenant(phoneNumberId, queryTenantId);

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant não identificado. Configure a integração em Settings > Integrações ou passe ?tenantId (dev)." },
        { status: 400 }
      );
    }

    const results = [];

    for (const entry of parsed.data.entry) {
      for (const change of entry.changes) {
        if (change.field !== "messages" || !change.value.messages?.length) continue;

        const contacts = change.value.contacts ?? [];

        for (const waMsg of change.value.messages) {
          if (waMsg.type !== "text") continue; // only text for simulation

          const senderProfile = contacts.find((c) => c.wa_id === waMsg.from);
          const senderName = senderProfile?.profile?.name;
          const timestamp = new Date(parseInt(waMsg.timestamp, 10) * 1000);

          try {
            const result = await processInboundMessage({
              tenantId,
              channel: "whatsapp",
              senderPhone: waMsg.from,
              senderName,
              content: waMsg.text.body,
              externalMessageId: waMsg.id,
              timestamp,
            });
            results.push({ waMessageId: waMsg.id, ...result });
          } catch (err) {
            results.push({
              waMessageId: waMsg.id,
              error: err instanceof Error ? err.message : "processing error",
            });
          }
        }
      }
    }

    return NextResponse.json({ processed: results.length, results, provider: "meta" });
  }

  // ── Branch 2: Z-API / Make (flat ou bundle Message) ─────────────────────────
  const tenantHint = await resolveZapiTenant({
    instanceId:
      typeof body?.instanceId === "string" ? body.instanceId : undefined,
    queryTenantId,
  });

  const zapi = parseZapiWebhook(body, {
    commercialPhone: tenantHint?.commercialPhone,
  });
  if (zapi.kind !== "message") {
    return NextResponse.json({ ok: true, skipped: true, reason: zapi.reason ?? "ignored" });
  }

  const resolved = await resolveZapiTenant({
    instanceId: zapi.instanceId,
    queryTenantId,
  });
  if (!resolved) {
    return NextResponse.json(
      { error: "Tenant não identificado para Z-API. Configure zapiInstanceId na integração WhatsApp." },
      { status: 400 }
    );
  }

  const auth = verifyZapiWebhookAuth({
    headers: req.headers,
    queryToken: query.get("token"),
    tokenFromIntegration: resolved.zapiWebhookToken,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized Z-API webhook." }, { status: 401 });
  }

  const result = await ingestWebhook({
    tenantId: resolved.tenantId,
    integrationId: resolved.integrationId,
    channel: "whatsapp",
    payload: body,
    process: () =>
      processInboundMessage({
        tenantId: resolved.tenantId,
        channel: "whatsapp",
        senderPhone: zapi.senderPhone,
        senderExternalId: zapi.senderExternalId,
        senderName: zapi.senderName,
        content: zapi.content!,
        externalMessageId: zapi.externalMessageId,
        fromMe: zapi.fromMe,
        timestamp: zapi.timestamp,
      }),
  });

  return NextResponse.json({ ok: true, provider: "zapi", result });
}
