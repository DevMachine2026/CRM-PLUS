type JsonObject = Record<string, unknown>;

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

function pickTimestamp(payload: JsonObject): Date | undefined {
  const moment = payload.momment ?? payload.moment ?? payload.timestamp;
  if (typeof moment === "number" && Number.isFinite(moment)) {
    // Z-API costuma enviar unix seconds.
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
  return undefined;
}

function cleanPhone(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const digits = input.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

export interface ParsedZapiWebhook {
  kind: "message" | "ignored";
  instanceId?: string;
  senderPhone?: string;
  senderName?: string;
  content?: string;
  externalMessageId?: string;
  fromMe?: boolean;
  timestamp?: Date;
  reason?: string;
}

export function parseZapiWebhook(payload: unknown): ParsedZapiWebhook {
  const body = asObject(payload);
  if (!body) return { kind: "ignored", reason: "invalid_body" };

  const content = pickText(body);
  const isGroup = body.isGroup === true;
  const fromMe = body.fromMe === true;
  const senderPhone = cleanPhone(body.phone);

  if (isGroup) return { kind: "ignored", reason: "group_ignored" };
  if (!content) return { kind: "ignored", reason: "no_text_content" };
  if (!senderPhone) return { kind: "ignored", reason: "invalid_sender_phone" };

  return {
    kind: "message",
    instanceId:
      typeof body.instanceId === "string" && body.instanceId.trim()
        ? body.instanceId.trim()
        : undefined,
    senderPhone,
    senderName:
      typeof body.senderName === "string" && body.senderName.trim()
        ? body.senderName.trim()
        : undefined,
    content,
    externalMessageId:
      typeof body.messageId === "string" && body.messageId.trim()
        ? body.messageId.trim()
        : undefined,
    fromMe,
    timestamp: pickTimestamp(body),
  };
}
