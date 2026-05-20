/**
 * Shared inbound-message processor for WhatsApp / Instagram webhooks.
 *
 * Tenant routing: callers must supply `tenantId` (from integration lookup).
 * Idempotency: duplicate `externalMessageId` per tenant is ignored.
 */

import { prisma } from "@/lib/db/client";
import { classifyLead } from "@/lib/ai/actions/classify-lead";
import { summarizeConversation } from "@/lib/ai/actions/summarize-conversation";
import { detectIntent }           from "@/lib/ai/actions/detect-intent";
import { suggestNextAction }      from "@/lib/ai/actions/suggest-next-action";
import {
  emitContactCreated,
  emitConversationCreated,
} from "@/lib/automations/emit";
import { isAiEnabled } from "@/lib/ai/tenant-settings";

export interface InboundPayload {
  tenantId:           string;
  channel:            "whatsapp" | "instagram";
  senderPhone?:       string;      // WhatsApp: E.164 digits, e.g. "5511999998888"
  senderExternalId?:  string;      // Instagram: page-scoped user ID (PSID)
  senderName?:        string;
  content:            string;
  externalMessageId?: string;      // wamid / mid — logged, not stored yet
  timestamp?:         Date;
}

export interface InboundResult {
  contactId:           string;
  conversationId:      string;
  messageId:           string;
  contactCreated:      boolean;
  conversationCreated: boolean;
  duplicate?:          boolean;
  intent?:             string;
}

export async function processInboundMessage(
  payload: InboundPayload
): Promise<InboundResult> {
  const { tenantId, channel, senderPhone, senderExternalId, senderName, content } = payload;
  const sentAt = payload.timestamp ?? new Date();

  // ── 1. Verify tenant ────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);
  const aiActive = isAiEnabled(tenant.settings);

  // ── 1b. Idempotency — skip duplicate Meta message IDs ───────────────────────
  if (payload.externalMessageId) {
    const existingMsg = await prisma.message.findFirst({
      where: { tenantId, externalId: payload.externalMessageId },
      select: {
        id: true,
        conversationId: true,
        conversation: { select: { contactId: true } },
      },
    });
    if (existingMsg) {
      return {
        contactId:           existingMsg.conversation.contactId ?? "",
        conversationId:      existingMsg.conversationId,
        messageId:           existingMsg.id,
        contactCreated:      false,
        conversationCreated: false,
        duplicate:           true,
      };
    }
  }

  // ── 2. Find or create contact ────────────────────────────────────────────────
  let contactCreated = false;
  let contact;

  if (channel === "whatsapp") {
    if (!senderPhone) throw new Error("whatsapp channel requires senderPhone");
    const normalized = senderPhone.replace(/\D/g, "");
    const phoneE164  = `+${normalized}`;

    contact = await prisma.contact.findFirst({
      where: { tenantId, phone: phoneE164 },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: { tenantId, name: senderName ?? `WA ${phoneE164}`, phone: phoneE164, status: "lead" },
      });
      contactCreated = true;
    } else if (senderName && contact.name.startsWith("WA +")) {
      // Update auto-generated name once we have the real name
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data:  { name: senderName },
      });
    }
  } else {
    if (!senderExternalId) throw new Error("instagram channel requires senderExternalId");

    contact = await prisma.contact.findFirst({
      where: { tenantId, externalId: senderExternalId },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId,
          name:       senderName ?? `IG ${senderExternalId.slice(-6)}`,
          externalId: senderExternalId,
          status:     "lead",
        },
      });
      contactCreated = true;
    } else if (senderName && contact.name.startsWith("IG ")) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data:  { name: senderName },
      });
    }
  }

  // ── 3. Find or create open conversation ─────────────────────────────────────
  let conversationCreated = false;
  let conversation = await prisma.conversation.findFirst({
    where:   { tenantId, contactId: contact.id, channel, status: { in: ["open", "pending"] } },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!conversation) {
    const channelLabel = channel === "whatsapp" ? "WhatsApp" : "Instagram";
    conversation = await prisma.conversation.create({
      data: {
        tenantId,
        contactId:     contact.id,
        channel,
        status:        "open",
        subject:       `${channelLabel} — ${contact.name}`,
        lastMessageAt: sentAt,
      },
    });
    conversationCreated = true;
    emitConversationCreated(tenantId, {
      id:        conversation.id,
      contactId: contact.id,
      channel,
      status:    conversation.status,
    });
  }

  if (contactCreated) {
    emitContactCreated(tenantId, {
      id:     contact.id,
      name:   contact.name,
      email:  contact.email,
      phone:  contact.phone,
      status: contact.status,
    });
    if (aiActive) {
      classifyLead({
        contactId: contact.id,
        tenantId,
        name:      contact.name,
        email:     contact.email,
        phone:     contact.phone,
      }).catch(() => {});
    }
  }

  // ── 4. Save message ─────────────────────────────────────────────────────────
  const message = await prisma.message.create({
    data: {
      tenantId,
      conversationId: conversation.id,
      direction:      "inbound",
      senderType:     "contact",
      senderId:       contact.id,
      content,
      sentAt,
      externalId:     payload.externalMessageId ?? null,
    },
  });

  // ── 5. Update conversation.lastMessageAt ────────────────────────────────────
  if (!conversationCreated) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data:  { lastMessageAt: sentAt },
    });
  }

  // ── 6. Log webhook receipt ──────────────────────────────────────────────────
  await prisma.aiLog.create({
    data: {
      tenantId,
      entityType:       "conversation",
      entityId:         conversation.id,
      action:           "webhook_received",
      modelProvider:    "mock",
      modelId:          "webhook-sim",
      promptTokens:     0,
      completionTokens: 0,
      inputSummary:  `channel=${channel}, from="${contact.name}", len=${content.length}, extMsgId=${payload.externalMessageId ?? "n/a"}`,
      outputSummary: `contactCreated=${contactCreated}, convCreated=${conversationCreated}, msgId=${message.id.slice(0, 8)}`,
    },
  });

  // ── 7. AI pipeline (fire-and-forget) — só se IA nativa ativa ───────────────
  if (aiActive) {
    const convId = conversation.id;
    Promise.all([
      summarizeConversation({ conversationId: convId, tenantId }),

      detectIntent({ conversationId: convId, tenantId, contactId: contact.id })
        .then(async (intentResult) => {
          if (
            intentResult.intent === "interest" ||
            intentResult.intent === "quote_request"
          ) {
            const opp = await prisma.opportunity.findFirst({
              where:   { tenantId, contactId: contact.id, status: "open" },
              include: { stage: true },
            });
            if (opp) {
              const daysSince = Math.floor(
                (Date.now() - opp.updatedAt.getTime()) / 86_400_000
              );
              await suggestNextAction({
                tenantId,
                contactId:            contact.id,
                opportunityId:        opp.id,
                opportunityStatus:    opp.status,
                stageName:            opp.stage?.name,
                daysSinceLastContact: daysSince,
              });
            }
          }
        }),
    ]).catch(() => {});
  }

  return {
    contactId:           contact.id,
    conversationId:      conversation.id,
    messageId:           message.id,
    contactCreated,
    conversationCreated,
  };
}
