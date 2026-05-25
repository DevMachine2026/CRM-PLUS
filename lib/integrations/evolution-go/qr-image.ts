/**
 * QR WhatsApp — PNG do Evolution GO (/instance/qr).
 * Prioridade: bytes image/png da resposta, depois campo `code`, nunca texto `qrcode` no <img>.
 */

export type GoQrRow = {
  code?: string;
  Code?: string;
  qrcode?: string;
  Qrcode?: string;
  [key: string]: unknown;
};

const MIN_IMAGE_BYTES = 200;

function bufferLooksLikeImage(buf: Buffer): boolean {
  if (buf.length < MIN_IMAGE_BYTES) return false;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  return false;
}

function decodeBase64Image(raw: string): Buffer | null {
  const trimmed = raw.trim();
  let b64 = trimmed;

  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",");
    if (comma < 0) return null;
    b64 = trimmed.slice(comma + 1);
  }

  if (trimmed.includes("@")) return null;

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
  const codeField = row.code ?? row.Code;
  if (codeField) {
    const direct = decodeBase64Image(codeField);
    if (direct) return direct;
  }

  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "string") continue;
    const lower = key.toLowerCase();
    if (lower === "qrcode" || lower === "pairingcode") continue;
    if (value.includes("@")) continue;
    const buf = decodeBase64Image(value);
    if (buf) return buf;
  }
  return null;
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
