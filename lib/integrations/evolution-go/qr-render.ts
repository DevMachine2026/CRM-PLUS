/**
 * Gera PNG escaneável a partir do payload texto do WhatsApp (campo qrcode do Evolution).
 * Usado só quando o GO não envia imagem em code/Qrcode.
 */

import QRCode from "qrcode";
import type { GoQrRow } from "./qr-image";
import { extractWhatsAppQrText } from "./qr-image";

export async function renderWhatsAppQrPngFromRow(row: GoQrRow | undefined): Promise<Buffer | null> {
  const payload = extractWhatsAppQrText(row);
  if (!payload) return null;

  try {
    return await QRCode.toBuffer(payload, {
      type: "png",
      errorCorrectionLevel: "L",
      margin: 2,
      width: 512,
    });
  } catch {
    return null;
  }
}
