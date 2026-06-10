/** Dígitos apenas — remove +, espaços, traços e outros não-numéricos. */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function whatsappMeUrl(phone: string | null | undefined): string | null {
  const digits = normalizeWhatsAppPhone(phone);
  return digits ? `https://wa.me/${digits}` : null;
}
