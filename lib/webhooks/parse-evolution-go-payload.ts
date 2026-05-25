/**
 * Parser de webhooks Evolution GO (+ compat messages.upsert / Baileys).
 * @see https://docs.evolutionfoundation.com.br/evolution-go/webhooks
 */

import {
  phoneFromWhatsAppJid,
  resolveInboundSenderPhone,
} from "@/lib/integrations/evolution-go/phone";
import { nativeGoQrPngToDataUrl, type GoQrRow } from "@/lib/integrations/evolution-go/qr-image";

export type EvolutionGoWebhookEvent = {
  kind: "message" | "connected" | "qrcode" | "ignored";
  instanceId?: string;
  instanceName?: string;
  instanceToken?: string;
  phoneNumber?: string;
  senderPhone?: string;
  senderName?: string;
  content?: string;
  externalMessageId?: string;
  qrCodeBase64?: string;
  rawEvent?: string;
  skipReason?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function normalizeEventName(event: string): string {
  return event.trim().toUpperCase();
}

function isInboundMessageEvent(event: string, eventNorm: string): boolean {
  if (eventNorm === "MESSAGE") return true;
  if (eventNorm === "MESSAGES.UPSERT" || eventNorm === "MESSAGES_UPSERT") return true;
  const lower = event.toLowerCase();
  return lower.includes("messages.upsert") || lower.includes("messages_upsert");
}

function extractMessageText(message: Record<string, unknown> | null): string | null {
  if (!message) return null;
  if (typeof message.conversation === "string" && message.conversation.trim()) {
    return message.conversation.trim();
  }
  const ext = asRecord(message.extendedTextMessage);
  if (ext && typeof ext.text === "string" && ext.text.trim()) return ext.text.trim();
  const img = asRecord(message.imageMessage);
  if (img && typeof img.caption === "string" && img.caption.trim()) return img.caption.trim();
  const video = asRecord(message.videoMessage);
  if (video && typeof video.caption === "string" && video.caption.trim()) return video.caption.trim();
  return null;
}

/** Formato webhook: data.key + data.message (MESSAGE / messages.upsert). */
function parseMessageFromKeyFormat(
  data: Record<string, unknown>,
  root: Record<string, unknown>,
  ctx: { instanceId?: string; instanceToken?: string },
  rawEvent: string,
): EvolutionGoWebhookEvent | null {
  const key = asRecord(data.key) ?? asRecord(data.Key);
  const message = asRecord(data.message) ?? asRecord(data.Message);
  if (!key || !message) return null;

  if (key.fromMe === true || key.FromMe === true) {
    return { kind: "ignored", rawEvent, skipReason: "fromMe" };
  }

  const senderPhone = resolveInboundSenderPhone({ key, data, root });
  const content = extractMessageText(message);
  if (!senderPhone) return { kind: "ignored", rawEvent, skipReason: "no_sender_phone" };
  if (!content) return { kind: "ignored", rawEvent, skipReason: "no_text_content" };

  const senderName =
    (typeof data.pushName === "string" ? data.pushName : undefined) ??
    (typeof data.PushName === "string" ? data.PushName : undefined);

  const externalMessageId =
    (typeof key.id === "string" ? key.id : undefined) ??
    (typeof key.ID === "string" ? key.ID : undefined);

  return {
    kind: "message",
    instanceId: ctx.instanceId,
    instanceToken: ctx.instanceToken,
    senderPhone,
    senderName,
    content,
    externalMessageId,
    rawEvent,
  };
}

/** Formato API: data.Info + data.Message. */
function parseMessageFromInfoFormat(
  data: Record<string, unknown>,
  ctx: { instanceId?: string; instanceToken?: string },
  rawEvent: string,
): EvolutionGoWebhookEvent | null {
  const info = asRecord(data.Info);
  if (!info) return null;

  if (info.IsFromMe === true) return { kind: "ignored", rawEvent, skipReason: "fromMe" };
  if (info.IsGroup === true) return { kind: "ignored", rawEvent, skipReason: "group" };

  const message = asRecord(data.Message);
  const content = extractMessageText(message);
  if (!content) return { kind: "ignored", rawEvent, skipReason: "no_text_content" };

  const senderJid = (info.Sender ?? info.Chat) as string | undefined;
  const senderPhone = phoneFromWhatsAppJid(senderJid);
  if (!senderPhone) return { kind: "ignored", rawEvent, skipReason: "no_sender_phone" };

  return {
    kind: "message",
    instanceId: ctx.instanceId,
    instanceToken: ctx.instanceToken,
    senderPhone,
    senderName: typeof info.PushName === "string" ? info.PushName : undefined,
    content,
    externalMessageId: typeof info.ID === "string" ? info.ID : undefined,
    rawEvent,
  };
}

/** Evolution GO — { event, instance, instanceId, data } */
export function parseEvolutionGoWebhook(body: unknown): EvolutionGoWebhookEvent {
  const root = asRecord(body);
  if (!root) return { kind: "ignored", skipReason: "invalid_body" };

  const event = String(root.event ?? "");
  const eventNorm = normalizeEventName(event);
  const data = asRecord(root.data);

  const instanceId =
    (typeof root.instanceId === "string" ? root.instanceId : undefined) ??
    (typeof data?.instanceId === "string" ? data.instanceId : undefined);

  const instanceToken =
    typeof root.instanceToken === "string" ? root.instanceToken : undefined;

  const instanceName =
    typeof root.instance === "string"
      ? root.instance
      : typeof root.instanceName === "string"
        ? root.instanceName
        : undefined;

  const ctx = { instanceId, instanceToken };

  if (eventNorm === "QRCODE" || eventNorm === "QRCODE_UPDATED") {
    if (!data) return { kind: "ignored", rawEvent: event, skipReason: "no_data" };
    const qrCodeBase64 = nativeGoQrPngToDataUrl(data as GoQrRow);
    if (!qrCodeBase64) return { kind: "ignored", rawEvent: event, skipReason: "no_qr_image" };
    return {
      kind: "qrcode",
      instanceId,
      instanceName,
      instanceToken,
      qrCodeBase64,
      rawEvent: event,
    };
  }

  if (
    eventNorm === "CONNECTED" ||
    eventNorm === "PAIRSUCCESS" ||
    eventNorm === "CONNECTION" ||
    eventNorm === "CONNECTION_UPDATE"
  ) {
    const jidCandidates = [
      data?.jid,
      data?.Jid,
      data?.ID,
      data?.id,
      data?.myJid,
      data?.MyJid,
      data?.remoteJid,
      root.sender,
    ];
    let phoneNumber: string | undefined;
    for (const c of jidCandidates) {
      if (typeof c !== "string") continue;
      phoneNumber = phoneFromWhatsAppJid(c);
      if (phoneNumber) break;
    }
    return {
      kind: "connected",
      instanceId,
      instanceName,
      instanceToken,
      phoneNumber,
      rawEvent: event,
    };
  }

  if (isInboundMessageEvent(event, eventNorm) && data) {
    const fromKey = parseMessageFromKeyFormat(data, root, ctx, event);
    if (fromKey?.kind === "message") {
      return { ...fromKey, instanceName };
    }
    if (fromKey?.kind === "ignored") return { ...fromKey, instanceName };

    const fromInfo = parseMessageFromInfoFormat(data, ctx, event);
    if (fromInfo?.kind === "message") {
      return { ...fromInfo, instanceName };
    }
    if (fromInfo?.kind === "ignored") return { ...fromInfo, instanceName };

    return { kind: "ignored", rawEvent: event, skipReason: "unparsed_message_shape" };
  }

  return { kind: "ignored", instanceId, instanceName, rawEvent: event || undefined };
}
