/**
 * Parser de webhooks Evolution GO.
 * @see https://docs.evolutionfoundation.com.br/evolution-go/webhooks
 */

import { phoneFromWhatsAppJid } from "@/lib/integrations/evolution-go/phone";
import { nativeGoQrPngToDataUrl, type GoQrRow } from "@/lib/integrations/evolution-go/qr-image";

export type EvolutionGoWebhookEvent = {
  kind: "message" | "connected" | "qrcode" | "ignored";
  instanceId?: string;
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
  data?: Record<string, unknown>;
  /** Legado Evolution API v2 (Baileys) */
  instance?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
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
  return null;
}

/** Evolution GO — { event, instanceId, data } */
export function parseEvolutionGoWebhook(body: unknown): EvolutionGoWebhookEvent {
  const root = asRecord(body);
  if (!root) return { kind: "ignored" };

  const event = String(root.event ?? "");
  const instanceId = typeof root.instanceId === "string" ? root.instanceId : undefined;
  const instanceToken =
    typeof root.instanceToken === "string" ? root.instanceToken : undefined;
  const data = asRecord(root.data);

  if (event === "QRCode" && data) {
    const qrCodeBase64 = nativeGoQrPngToDataUrl(data as GoQrRow);
    if (!qrCodeBase64) return { kind: "ignored", rawEvent: event };
    return { kind: "qrcode", instanceId, instanceToken, qrCodeBase64, rawEvent: event };
  }

  if (event === "Connected" || event === "PairSuccess") {
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
      instanceToken,
      phoneNumber,
      rawEvent: event,
    };
  }

  if (event === "Message" && data) {
    const info = asRecord(data.Info);
    if (info?.IsFromMe === true) return { kind: "ignored", rawEvent: event };
    if (info?.IsGroup === true) return { kind: "ignored", rawEvent: event };

    const message = asRecord(data.Message);
    const content = extractMessageText(message);
    if (!content) return { kind: "ignored", rawEvent: event };

    const senderJid = (info?.Sender ?? info?.Chat) as string | undefined;
    const senderPhone = phoneFromWhatsAppJid(senderJid);
    if (!senderPhone) return { kind: "ignored", rawEvent: event };

    return {
      kind: "message",
      instanceId,
      instanceToken,
      senderPhone,
      senderName: typeof info?.PushName === "string" ? info.PushName : undefined,
      content,
      externalMessageId: typeof info?.ID === "string" ? info.ID : undefined,
      rawEvent: event,
    };
  }

  // Legado Evolution API v2 (Baileys) — compat dev
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
        senderPhone: from,
        content: text,
        externalMessageId: typeof key?.id === "string" ? key.id : undefined,
        rawEvent: event,
      };
    }
  }

  return { kind: "ignored", instanceId, rawEvent: event || undefined };
}
