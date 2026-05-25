/**
 * Converte resposta do Evolution GO /instance/qr em data URL exibível no <img>.
 * - "code" = PNG em base64 (imagem pronta)
 * - "qrcode" = string de pareamento WhatsApp → geramos PNG via API pública
 */

/** PNG base64 válido para <img src="data:image/png;base64,..."> */
export function pngBase64ToDataUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim();
  if (s.startsWith("data:image/")) return isValidQrDataUrl(s) ? s : undefined;

  if (s.includes("@")) return undefined;

  const b64 = s.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64) || b64.length < 80) return undefined;
  if (!b64.startsWith("iVBOR")) return undefined;

  return `data:image/png;base64,${b64}`;
}

export function isValidQrDataUrl(src: string | null | undefined): boolean {
  if (!src || typeof src !== "string") return false;
  if (!src.startsWith("data:image/")) return false;
  if (src.includes("@")) return false;
  if (src.length < 120) return false;
  return true;
}

/** Gera imagem QR a partir do payload textual (campo qrcode do Evolution GO). */
export async function pairingStringToQrDataUrl(text: string): Promise<string | undefined> {
  const payload = text.trim();
  if (!payload) return undefined;

  const url = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=png&data=${encodeURIComponent(payload)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return undefined;
    return `data:image/png;base64,${buf.toString("base64")}`;
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

  const fromPng = pngBase64ToDataUrl(row.code ?? row.Code);
  if (fromPng && isValidQrDataUrl(fromPng)) return { qrCodeBase64: fromPng };

  const pairingPayload = (row.qrcode ?? row.Qrcode)?.trim();
  if (pairingPayload) {
    const generated = await pairingStringToQrDataUrl(pairingPayload);
    if (generated && isValidQrDataUrl(generated)) {
      return { qrCodeBase64: generated, pairingPayload };
    }
  }

  return {};
}
