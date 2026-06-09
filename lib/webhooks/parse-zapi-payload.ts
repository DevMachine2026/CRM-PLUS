import {
  phoneFromWhatsAppJid,
  resolveInboundSenderPhone,
} from "@/lib/integrations/evolution-go/phone";

type JsonObject = Record<string, unknown>;

export interface ParseZapiOptions {
  /** Telefone comercial cadastrado na integração (credentials.phoneNumber). */
  commercialPhone?: string;
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" ? (value as JsonObject) : null;
}

function pickText(payload: JsonObject): string | null {
  const text = asObject(payload.text);
  if (typeof text?.message === "string" && text.message.trim()) {
    return text.message.trim();
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  if (typeof payload.body === "string" && payload.body.trim()) {
    return payload.body.trim();
  }
  return null;
}

function pickGoMessageText(message: JsonObject | null): string | null {
  if (!message) return null;
  if (typeof message.conversation === "string" && message.conversation.trim()) {
    return message.conversation.trim();
  }
  const ext = asObject(message.extendedTextMessage);
  if (ext && typeof ext.text === "string" && ext.text.trim()) return ext.text.trim();
  const img = asObject(message.imageMessage);
  if (img && typeof img.caption === "string" && img.caption.trim()) return img.caption.trim();
  return null;
}

function pickTimestamp(payload: JsonObject): Date | undefined {
  const moment = payload.momment ?? payload.moment ?? payload.timestamp;
  if (typeof moment === "number" && Number.isFinite(moment)) {
    const millis = moment > 1_000_000_000_000 ? moment : moment * 1000;
    return new Date(millis);
  }
  if (typeof moment === "string" && moment.trim()) {
    const n = Number(moment);
    if (Number.isFinite(n)) {
      const millis = n > 1_000_000_000_000 ? n : n * 1000;
      return new Date(millis);
    }
  }
  const info = asObject(asObject(payload.data)?.Info);
  const ts = info?.Timestamp;
  if (typeof ts === "string" && ts.trim()) {
    const parsed = Date.parse(ts);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return undefined;
}

function cleanPhone(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const digits = input.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

function normalizeDigits(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const digits = input.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

/** Telefone do payload parece linha comercial (Make manda número fixo errado). */
export function isLikelyBusinessLinePhone(
  candidate: string | undefined,
  commercialPhone: string | undefined,
  connectedPhone?: string | undefined,
): boolean {
  const phone = normalizeDigits(candidate);
  if (!phone) return false;

  const commercial = normalizeDigits(commercialPhone);
  const connected = normalizeDigits(connectedPhone);

  if (commercial && phone === commercial) return true;
  if (connected && phone === connected) return true;

  if (commercial) {
    const shared = commonPrefixLength(phone, commercial);
    const lenDiff = Math.abs(phone.length - commercial.length);
    if (shared >= 10 && lenDiff <= 2) return true;
  }

  return false;
}

function commonPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let i = 0;
  while (i < limit && a[i] === b[i]) i += 1;
  return i;
}

export function slugSenderName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function zapiPushExternalId(senderName: string): string {
  const slug = slugSenderName(senderName);
  return slug ? `zapi-push:${slug}` : "zapi-push:unknown";
}

function pickFlatSenderPhone(
  body: JsonObject,
  options?: ParseZapiOptions,
): string | undefined {
  const commercial = options?.commercialPhone;
  const connected = cleanPhone(body.connectedPhone);

  const candidates = [
    body.phone,
    body.chatPhone,
    body.senderPhone,
    body.participantPhone,
  ];

  for (const raw of candidates) {
    const phone = cleanPhone(raw);
    if (!phone) continue;
    if (isLikelyBusinessLinePhone(phone, commercial, connected)) continue;
    return phone;
  }

  return undefined;
}

function parseGoStyleMessage(
  body: JsonObject,
  options?: ParseZapiOptions,
): ParsedZapiWebhook | null {
  const event = typeof body.event === "string" ? body.event.trim() : "";
  if (event.toUpperCase() !== "MESSAGE") return null;

  const data = asObject(body.data);
  if (!data) return null;

  const info = asObject(data.Info);
  const message = asObject(data.Message) ?? asObject(data.message);
  if (!message) return null;

  const isGroup = info?.IsGroup === true;
  if (isGroup) return { kind: "ignored", reason: "group_ignored" };

  const fromMe = info?.IsFromMe === true;
  const content = pickGoMessageText(message);
  if (!content) return { kind: "ignored", reason: "no_text_content" };

  const chatJid = (info?.Chat ?? info?.chat) as string | undefined;
  let senderPhone =
    resolveInboundSenderPhone({ data, info }) ??
    phoneFromWhatsAppJid(chatJid) ??
    phoneFromWhatsAppJid(info?.Sender as string | undefined);

  const commercial = options?.commercialPhone;
  const connected = cleanPhone(body.connectedPhone);
  if (senderPhone && isLikelyBusinessLinePhone(senderPhone, commercial, connected)) {
    senderPhone = undefined;
  }

  const senderName =
    (typeof info?.PushName === "string" && info.PushName.trim()
      ? info.PushName.trim()
      : undefined) ??
    (typeof body.senderName === "string" && body.senderName.trim()
      ? body.senderName.trim()
      : undefined);

  let senderExternalId: string | undefined;
  if (!fromMe && !senderPhone && senderName) {
    senderExternalId = zapiPushExternalId(senderName);
  } else if (!fromMe && !senderPhone) {
    return { kind: "ignored", reason: "invalid_sender_phone" };
  }

  return {
    kind: "message",
    instanceId:
      typeof body.instanceId === "string" && body.instanceId.trim()
        ? body.instanceId.trim()
        : undefined,
    senderPhone,
    senderExternalId,
    senderName,
    content,
    externalMessageId:
      (typeof info?.ID === "string" && info.ID.trim() ? info.ID.trim() : undefined) ??
      (typeof body.messageId === "string" && body.messageId.trim()
        ? body.messageId.trim()
        : undefined),
    fromMe,
    timestamp: pickTimestamp(body),
  };
}

export interface ParsedZapiWebhook {
  kind: "message" | "ignored";
  instanceId?: string;
  senderPhone?: string;
  /** Quando o Make manda phone fixo da linha comercial, identifica contato pelo push name. */
  senderExternalId?: string;
  senderName?: string;
  content?: string;
  externalMessageId?: string;
  fromMe?: boolean;
  timestamp?: Date;
  reason?: string;
}

export function parseZapiWebhook(
  payload: unknown,
  options?: ParseZapiOptions,
): ParsedZapiWebhook {
  const body = asObject(payload);
  if (!body) return { kind: "ignored", reason: "invalid_body" };

  const goParsed = parseGoStyleMessage(body, options);
  if (goParsed) return goParsed;

  const content = pickText(body);
  const isGroup = body.isGroup === true;
  const fromMe = body.fromMe === true;

  if (isGroup) return { kind: "ignored", reason: "group_ignored" };
  if (!content) return { kind: "ignored", reason: "no_text_content" };

  const senderName =
    typeof body.senderName === "string" && body.senderName.trim()
      ? body.senderName.trim()
      : undefined;

  let senderPhone = pickFlatSenderPhone(body, options);
  let senderExternalId: string | undefined;

  if (!fromMe && !senderPhone && senderName) {
    senderExternalId = zapiPushExternalId(senderName);
  } else if (!senderPhone && !senderExternalId) {
    return { kind: "ignored", reason: "invalid_sender_phone" };
  }

  return {
    kind: "message",
    instanceId:
      typeof body.instanceId === "string" && body.instanceId.trim()
        ? body.instanceId.trim()
        : undefined,
    senderPhone,
    senderExternalId,
    senderName,
    content,
    externalMessageId:
      typeof body.messageId === "string" && body.messageId.trim()
        ? body.messageId.trim()
        : undefined,
    fromMe,
    timestamp: pickTimestamp(body),
  };
}
