/**
 * Converte resposta do Evolution GO /instance/qr em data URL exibível no <img>.
 * Prioridade: PNG nativo do Evolution (campo code). Fallback: gerar QR do texto qrcode.
 */

import QRCode from "qrcode";

/** Imagem (PNG/JPEG) em base64 válida para <img> */
export function imageBase64ToDataUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim();
  if (s.startsWith("data:image/")) return isValidQrDataUrl(s) ? s : undefined;

  if (s.includes("@")) return undefined;

  const b64 = s.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64) || b64.length < 80) return undefined;
  // PNG ou JPEG do Evolution
  if (!b64.startsWith("iVBOR") && !b64.startsWith("/9j/")) return undefined;

  const mime = b64.startsWith("/9j/") ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${b64}`;
}

export function isValidQrDataUrl(src: string | null | undefined): boolean {
  if (!src || typeof src !== "string") return false;
  if (!src.startsWith("data:image/")) return false;
  if (src.includes("@")) return false;
  if (src.length < 200) return false;
  return true;
}

/** QR de alta resolução a partir do payload WhatsApp (campo qrcode). */
export async function pairingStringToQrDataUrl(text: string): Promise<string | undefined> {
  const payload = text.trim();
  if (!payload) return undefined;

  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "L",
      margin: 2,
      width: 512,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    return undefined;
  }
}

export type GoQrRow = {
  code?: string;
  Code?: string;
  qrcode?: string;
  Qrcode?: string;
};

export async function resolveQrDisplayFromGoRow(
  row: GoQrRow | undefined,
): Promise<{ qrCodeBase64?: string; pairingPayload?: string }> {
  if (!row) return {};

  const codeRaw = row.code ?? row.Code;
  const fromNative = imageBase64ToDataUrl(codeRaw);
  if (fromNative && isValidQrDataUrl(fromNative)) {
    return { qrCodeBase64: fromNative };
  }

  const pairingPayload = (row.qrcode ?? row.Qrcode ?? codeRaw)?.trim();
  if (!pairingPayload) return {};

  const generated = await pairingStringToQrDataUrl(pairingPayload);
  if (generated && isValidQrDataUrl(generated)) {
    return { qrCodeBase64: generated, pairingPayload };
  }

  return {};
}
