/**
 * QR WhatsApp — somente PNG nativo do Evolution GO (campo `code`).
 * Nunca recriar QR a partir do texto `qrcode` (ilegível / não reconhecido pelo WhatsApp).
 */

export type GoQrRow = {
  code?: string;
  Code?: string;
  qrcode?: string;
  Qrcode?: string;
};

const MIN_PNG_BYTES = 400;

function decodeBase64Payload(raw: string): Buffer | null {
  const trimmed = raw.trim();
  let b64 = trimmed;

  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",");
    if (comma < 0) return null;
    b64 = trimmed.slice(comma + 1);
  }

  b64 = b64.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64)) return null;
  if (!b64.startsWith("iVBOR")) return null;

  try {
    const buf = Buffer.from(b64, "base64");
    return buf.length >= MIN_PNG_BYTES ? buf : null;
  } catch {
    return null;
  }
}

/** Extrai PNG binário oficial do Evolution (única fonte válida para escanear no WhatsApp). */
export function extractNativeGoQrPng(row: GoQrRow | undefined): Buffer | null {
  if (!row) return null;
  const raw = row.code ?? row.Code;
  if (!raw || typeof raw !== "string") return null;
  return decodeBase64Payload(raw);
}

export function nativeGoQrPngToDataUrl(row: GoQrRow | undefined): string | undefined {
  const buf = extractNativeGoQrPng(row);
  if (!buf) return undefined;
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** @deprecated Use extractNativeGoQrPng — validação de data URL legada */
export function isValidQrDataUrl(src: string | null | undefined): boolean {
  if (!src || typeof src !== "string") return false;
  if (!src.startsWith("data:image/png")) return false;
  if (src.includes("@")) return false;
  const comma = src.indexOf(",");
  if (comma < 0) return false;
  const buf = decodeBase64Payload(src);
  return !!buf;
}
