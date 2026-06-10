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

/** Resolve telefone para wa.me a partir de phone ou externalId (exceto zapi-push). */
export function resolveContactWhatsAppPhone(contact: {
  phone?: string | null;
  externalId?: string | null;
}): string | null {
  const fromPhone = normalizeWhatsAppPhone(contact.phone);
  if (fromPhone && fromPhone.length >= 10) return fromPhone;

  const ext = contact.externalId?.trim();
  if (!ext || ext.startsWith("zapi-push:")) return null;

  const fromExt = normalizeWhatsAppPhone(ext);
  if (fromExt && fromExt.length >= 10 && fromExt.length <= 15) return fromExt;

  return null;
}
