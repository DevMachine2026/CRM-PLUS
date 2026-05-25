/**
 * Parser de webhooks Evolution GO.
 * @see https://docs.evolutionfoundation.com.br/evolution-go/webhooks
 */

import { phoneFromWhatsAppJid } from "@/lib/integrations/evolution-go/phone";
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
};

type GoWebhookBody = {
  event?: string;
  instanceId?: string;
  instanceToken?: string;
  instance?: string;
  data?: Record<string, unknown>;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function normalizeEventName(event: string): string {
  return event.trim().toUpperCase();
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

/** Formato webhook GO: data.key + data.message (event MESSAGE). */
function parseMessageFromKeyFormat(
  data: Record<string, unknown>,
  ctx: { instanceId?: string; instanceToken?: string },
): EvolutionGoWebhookEvent | null {
  const key = asRecord(data.key) ?? asRecord(data.Key);
  const message = asRecord(data.message) ?? asRecord(data.Message);
  if (!key || !message) return null;

  if (key.fromMe === true || key.FromMe === true) {
    return { kind: "ignored", rawEvent: "MESSAGE" };
  }

  const remoteJid = (key.remoteJid ?? key.RemoteJid) as string | undefined;
  const senderPhone = phoneFromWhatsAppJid(remoteJid);
  const content = extractMessageText(message);
  if (!senderPhone || !content) return null;

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
    rawEvent: "MESSAGE",
  };
}

/** Formato API GO: data.Info + data.Message (event Message). */
function parseMessageFromInfoFormat(
  data: Record<string, unknown>,
  ctx: { instanceId?: string; instanceToken?: string },
): EvolutionGoWebhookEvent | null {
  const info = asRecord(data.Info);
  if (!info) return null;

  if (info.IsFromMe === true) return { kind: "ignored", rawEvent: "Message" };
  if (info.IsGroup === true) return { kind: "ignored", rawEvent: "Message" };

  const message = asRecord(data.Message);
  const content = extractMessageText(message);
  if (!content) return null;

  const senderJid = (info.Sender ?? info.Chat) as string | undefined;
  const senderPhone = phoneFromWhatsAppJid(senderJid);
  if (!senderPhone) return null;

  return {
    kind: "message",
    instanceId: ctx.instanceId,
    instanceToken: ctx.instanceToken,
    senderPhone,
    senderName: typeof info.PushName === "string" ? info.PushName : undefined,
    content,
    externalMessageId: typeof info.ID === "string" ? info.ID : undefined,
    rawEvent: "Message",
  };
}

/** Evolution GO — { event, instanceId, instance, data } */
export function parseEvolutionGoWebhook(body: unknown): EvolutionGoWebhookEvent {
  const root = asRecord(body);
  if (!root) return { kind: "ignored" };

  const event = String(root.event ?? "");
  const eventNorm = normalizeEventName(event);
  const instanceId = typeof root.instanceId === "string" ? root.instanceId : undefined;
  const instanceToken =
    typeof root.instanceToken === "string" ? root.instanceToken : undefined;
  const instanceName =
    typeof root.instance === "string"
      ? root.instance
      : typeof root.instanceName === "string"
        ? root.instanceName
        : undefined;
  const data = asRecord(root.data);
  const ctx = { instanceId, instanceToken };

  if (eventNorm === "QRCODE" && data) {
    const qrCodeBase64 = nativeGoQrPngToDataUrl(data as GoQrRow);
    if (!qrCodeBase64) return { kind: "ignored", rawEvent: event };
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
    eventNorm === "CONNECTION"
  ) {
    const jidCandidates = [
      data?.jid,
      data?.Jid,
      data?.ID,
      data?.id,
      data?.myJid,
      data?.MyJid,
      data?.remoteJid,
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

  if (eventNorm === "MESSAGE" && data) {
    const fromKey = parseMessageFromKeyFormat(data, ctx);
    if (fromKey && fromKey.kind === "message") {
      return { ...fromKey, instanceName };
    }
    if (fromKey?.kind === "ignored") return fromKey;

    const fromInfo = parseMessageFromInfoFormat(data, ctx);
    if (fromInfo && fromInfo.kind === "message") {
      return { ...fromInfo, instanceName };
    }
    if (fromInfo?.kind === "ignored") return fromInfo;

    return { kind: "ignored", rawEvent: event };
  }

  // Legado Evolution API v2 (Baileys)
  if (
    (event.includes("MESSAGES") || event.includes("messages")) &&
    data &&
    typeof root.instance === "string"
  ) {
    const key = asRecord(data.key);
    const msg = asRecord(data.message);
    const from = key?.remoteJid ? phoneFromWhatsAppJid(String(key.remoteJid)) : undefined;
    const text = extractMessageText(msg);
    if (from && text) {
      return {
        kind: "message",
        instanceId: root.instance,
        instanceName: root.instance,
        senderPhone: from,
        content: text,
        externalMessageId: typeof key?.id === "string" ? key.id : undefined,
        rawEvent: event,
      };
    }
  }

  return { kind: "ignored", instanceId, instanceName, rawEvent: event || undefined };
}
