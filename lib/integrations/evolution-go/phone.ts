/**
 * Extrai E.164 só de JID WhatsApp real (ex.: 5511999999999@s.whatsapp.net).
 * Ignora PushName, targetPhone digitado no formulário e JIDs @lid.
 */
export function phoneFromWhatsAppJid(jid: string | undefined): string | undefined {
  if (!jid || typeof jid !== "string") return undefined;
  const trimmed = jid.trim();
  if (!trimmed.includes("@")) return undefined;

  const [local, domainRaw] = trimmed.split("@");
  const domain = domainRaw?.toLowerCase() ?? "";
  if (!local || domain === "lid" || domain === "g.us" || domain === "broadcast") {
    return undefined;
  }
  if (domain !== "s.whatsapp.net" && domain !== "c.us") return undefined;

  const digits = local.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return undefined;
  return digits;
}

/**
 * Normaliza telefone para Evolution GO (apenas dígitos, com DDI 55 para BR).
 */
export function normalizeWhatsAppPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Informe o número com DDD (ex.: 11 98765-4321).");
  }
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12) return digits;
  throw new Error("Número inválido. Use DDI 55 + DDD + número (ex.: 5511987654321).");
}

export function formatPhoneDisplay(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) {
    return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  }
  return d ? `+${d}` : "";
}
