/**
 * Política de ingestão WhatsApp via webhook Evolution.
 * Padrão: só conversas 1:1 (privado). Grupos exigem WHATSAPP_INGEST_GROUPS=true.
 */

export function isWhatsAppGroupIngestEnabled(): boolean {
  return process.env.WHATSAPP_INGEST_GROUPS === "true";
}

export function isIgnoredWhatsAppChatJid(jid: string | undefined): boolean {
  if (!jid) return false;
  const lower = jid.toLowerCase();
  return (
    lower.includes("status@broadcast") ||
    lower.includes("@broadcast") ||
    lower.includes("newsletter")
  );
}
