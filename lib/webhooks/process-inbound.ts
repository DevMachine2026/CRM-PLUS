/**
 * Shared inbound-message processor for WhatsApp / Instagram webhooks.
 *
 * Tenant routing: callers must supply `tenantId` (from integration lookup).
 * Idempotency: duplicate `externalMessageId` per tenant is ignored.
 */

import { prisma } from "@/lib/db/client";
import { classifyLead } from "@/lib/ai/actions/classify-lead";
import { summarizeConversation } from "@/lib/ai/actions/summarize-conversation";
import {
  emitContactCreated,
  emitConversationCreated,
} from "@/lib/automations/emit";
import { isAiEnabled } from "@/lib/ai/tenant-settings";
import { zapiPushExternalId } from "@/lib/webhooks/parse-zapi-payload";
import type { Contact } from "@/lib/generated/prisma/client";

function toPhoneE164(digits: string): string {
  return `+${digits.replace(/\D/g, "")}`;
}

function isPlaceholderContactName(name: string, externalId: string | null): boolean {
  if (externalId && name === externalId) return true;
  return name.startsWith("WA ");
}

/** Localiza ou cria contato WhatsApp, mesclando zapi-push quando o phone chega depois. */
async function upsertWhatsAppContact(
  tenantId: string,
  senderPhone: string | undefined,
  senderExternalId: string | undefined,
  senderName: string | undefined,
): Promise<{ contact: Contact; created: boolean }> {
  const phoneE164 = senderPhone ? toPhoneE164(senderPhone) : undefined;
  const pushId = senderName ? zapiPushExternalId(senderName) : undefined;

  let contact =
    phoneE164
      ? await prisma.contact.findFirst({ where: { tenantId, phone: phoneE164 } })
      : null;

  if (!contact && senderExternalId) {
    contact = await prisma.contact.findFirst({
      where: { tenantId, externalId: senderExternalId },
    });
  }

  if (!contact && pushId && pushId !== senderExternalId) {
    contact = await prisma.contact.findFirst({
      where: { tenantId, externalId: pushId },
    });
  }

  const displayName = senderName?.trim() || undefined;

  if (contact) {
    const patch: { phone?: string; name?: string } = {};
    if (phoneE164 && !contact.phone) patch.phone = phoneE164;
    if (displayName && isPlaceholderContactName(contact.name, contact.externalId)) {
      patch.name = displayName;
    }
    if (Object.keys(patch).length > 0) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data:  patch,
      });
    }
    return { contact, created: false };
  }

  if (!phoneE164 && !senderExternalId && !pushId) {
    throw new Error("whatsapp channel requires senderPhone or senderExternalId");
  }

  contact = await prisma.contact.create({
    data: {
      tenantId,
      name:       displayName ?? (phoneE164 ? `WA ${phoneE164}` : `WA ${(senderExternalId ?? pushId)!.slice(-12)}`),
      phone:      phoneE164 ?? null,
      externalId: senderExternalId ?? pushId ?? null,
      status:     "lead",
    },
  });
  return { contact, created: true };
}

export interface InboundPayload {
  tenantId:           string;
  channel:            "whatsapp" | "instagram";
  senderPhone?:       string;      // WhatsApp: E.164 digits, e.g. "5511999998888"
  senderExternalId?:  string;      // Instagram: page-scoped user ID (PSID)
  senderName?:        string;
  content:            string;
  externalMessageId?: string;      // wamid / mid — logged, not stored yet
  timestamp?:         Date;
  /** Grupo WhatsApp (@g.us) — uma conversa por groupJid no inbox */
  groupJid?:          string;
  /** Mensagem enviada pelo aparelho conectado (1:1) */
  fromMe?:            boolean;
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
    const upserted = await upsertWhatsAppContact(
      tenantId,
      senderPhone,
      senderExternalId,
      senderName,
    );
    contact = upserted.contact;
    contactCreated = upserted.created;
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
  const groupSubject =
    payload.groupJid && channel === "whatsapp" ? `wa-group:${payload.groupJid}` : null;

  let conversation = groupSubject
    ? await prisma.conversation.findFirst({
        where: { tenantId, channel, subject: groupSubject, status: { in: ["open", "pending"] } },
        orderBy: { lastMessageAt: "desc" },
      })
    : await prisma.conversation.findFirst({
        where: { tenantId, contactId: contact.id, channel, status: { in: ["open", "pending"] } },
        orderBy: { lastMessageAt: "desc" },
      });

  if (!conversation) {
    const channelLabel = channel === "whatsapp" ? "WhatsApp" : "Instagram";
    const subject = groupSubject
      ? groupSubject
      : `${channelLabel} — ${contact.name}`;
    conversation = await prisma.conversation.create({
      data: {
        tenantId,
        contactId:     contact.id,
        channel,
        status:        "open",
        subject,
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
  }

  // ── 4. Save message ─────────────────────────────────────────────────────────
  const isOutbound = payload.fromMe === true;
  const message = await prisma.message.create({
    data: {
      tenantId,
      conversationId: conversation.id,
      direction:      isOutbound ? "outbound" : "inbound",
      senderType:     isOutbound ? "user" : "contact",
      senderId:       isOutbound ? null : contact.id,
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
  if (aiActive && !isOutbound) {
    const convId = conversation.id;
    const recentMessages = await prisma.message.findMany({
      where:   { conversationId: convId, tenantId },
      orderBy: { sentAt: "desc" },
      take:    10,
      select:  { content: true, direction: true },
    });

    Promise.all([
      summarizeConversation({ conversationId: convId, tenantId }),
      classifyLead({
        contactId:       contact.id,
        tenantId,
        name:            contact.name,
        email:           contact.email,
        phone:           contact.phone,
        companyId:       contact.companyId,
        conversationId:  convId,
        lastMessage:     content,
        recentMessages:  [...recentMessages].reverse(),
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
