/** Estados de entrega exibidos na UI (client + servidor). */
export type MessageDeliveryState =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "simulated"
  | "skipped"
  | "failed";

export type ConvMessage = {
  id: string;
  content: string;
  direction: string;
  senderType: string;
  sentAt: string;
  type?: string;
  externalStatus?: string | null;
  deliveryError?: string | null;
  /** Otimista: ainda não confirmado pela API */
  pending?: boolean;
  /** Falha no envio (canal ou API) */
  failed?: boolean;
};

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i;
const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|aac|opus)(\?|$)/i;

export function normalizeMessage(raw: {
  id: string;
  content: string;
  direction: string;
  senderType: string;
  sentAt: string | Date;
  type?: string;
  externalStatus?: string | null;
  deliveryError?: string | null;
}): ConvMessage {
  return {
    id:             raw.id,
    content:        raw.content,
    direction:      raw.direction,
    senderType:     raw.senderType,
    sentAt:         typeof raw.sentAt === "string" ? raw.sentAt : raw.sentAt.toISOString(),
    type:           raw.type ?? "text",
    externalStatus: raw.externalStatus ?? null,
    deliveryError:  raw.deliveryError ?? null,
  };
}

export function deliveryState(msg: ConvMessage): MessageDeliveryState {
  if (msg.pending) return "sending";
  if (msg.failed || msg.externalStatus === "failed") return "failed";
  const s = msg.externalStatus;
  if (s === "delivered") return "delivered";
  if (s === "read") return "read";
  if (s === "simulated") return "simulated";
  if (s === "skipped") return "skipped";
  if (s === "sent") return "sent";
  if (msg.direction === "outbound") return "sent";
  return "sent";
}

export type MediaKind = "text" | "image" | "audio" | "video" | "document";

export function mediaKind(msg: ConvMessage): MediaKind {
  const t = (msg.type ?? "text").toLowerCase();
  if (t === "image" || t === "audio" || t === "video" || t === "document") return t;
  const c = msg.content.trim();
  if (IMAGE_EXT.test(c) || c.startsWith("data:image/")) return "image";
  if (AUDIO_EXT.test(c)) return "audio";
  if (/^\[.?(imagem|image|foto)/i.test(c)) return "image";
  if (/^\[.?(áudio|audio|voice)/i.test(c)) return "audio";
  if (/^\[.?(vídeo|video)/i.test(c)) return "video";
  if (/^\[.?(documento|arquivo|file)/i.test(c)) return "document";
  return "text";
}

export function isRenderableUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
