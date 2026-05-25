/**
 * QR WhatsApp — Evolution GO (/instance/qr).
 * 1) PNG em qualquer campo (code, Qrcode, qrCode, image/*)
 * 2) Fallback: gera PNG do payload texto (2@…) quando o GO não manda imagem
 */

export type GoQrRow = {
  code?: string;
  Code?: string;
  qrcode?: string;
  Qrcode?: string;
  qrCode?: string;
  [key: string]: unknown;
};

const MIN_IMAGE_BYTES = 200;

function bufferLooksLikeImage(buf: Buffer): boolean {
  if (buf.length < MIN_IMAGE_BYTES) return false;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  return false;
}

function isWhatsAppSessionPayload(value: string): boolean {
  return value.includes("@") && !value.startsWith("data:");
}

function decodeBase64Image(raw: string): Buffer | null {
  const trimmed = raw.trim();
  let b64 = trimmed;

  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",");
    if (comma < 0) return null;
    b64 = trimmed.slice(comma + 1);
  } else if (isWhatsAppSessionPayload(trimmed)) {
    return null;
  }

  b64 = b64.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64) || b64.length < 80) return null;

  try {
    const buf = Buffer.from(b64, "base64");
    return bufferLooksLikeImage(buf) ? buf : null;
  } catch {
    return null;
  }
}

function extractFromRow(row: GoQrRow): Buffer | null {
  const priority = [
    row.code,
    row.Code,
    row.Qrcode,
    row.qrcode,
    row.qrCode,
  ];
  for (const value of priority) {
    if (typeof value !== "string") continue;
    const buf = decodeBase64Image(value);
    if (buf) return buf;
  }

  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "string") continue;
    if (key.toLowerCase() === "pairingcode") continue;
    if (isWhatsAppSessionPayload(value)) continue;
    const buf = decodeBase64Image(value);
    if (buf) return buf;
  }
  return null;
}

/** Payload de sessão WhatsApp (2@…) para gerar QR quando não há PNG na resposta. */
export function extractWhatsAppQrText(row: GoQrRow | undefined): string | null {
  if (!row) return null;
  const priority = [row.qrcode, row.Qrcode, row.code, row.Code];
  for (const value of priority) {
    if (typeof value === "string" && isWhatsAppSessionPayload(value)) return value;
  }
  return null;
}

/** Normaliza envelope JSON do Evolution GO. */
export function normalizeGoQrRow(body: unknown): GoQrRow | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;

  if (typeof root.qrCode === "string") {
    return { code: root.qrCode };
  }

  const data = root.data;
  if (typeof data === "string") return { code: data };
  if (data && typeof data === "object") return data as GoQrRow;

  return root as GoQrRow;
}

/** Extrai PNG/JPEG binário da resposta JSON do Evolution. */
export function extractNativeGoQrPng(row: GoQrRow | undefined): Buffer | null {
  if (!row) return null;
  return extractFromRow(row);
}

export function nativeGoQrPngToDataUrl(row: GoQrRow | undefined): string | undefined {
  const buf = extractNativeGoQrPng(row);
  if (!buf) return undefined;
  const mime = buf[0] === 0xff ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export function isValidQrDataUrl(src: string | null | undefined): boolean {
  if (!src || typeof src !== "string") return false;
  if (!src.startsWith("data:image/")) return false;
  if (src.includes("@")) return false;
  const comma = src.indexOf(",");
  if (comma < 0) return false;
  return !!decodeBase64Image(src.slice(comma + 1));
}
