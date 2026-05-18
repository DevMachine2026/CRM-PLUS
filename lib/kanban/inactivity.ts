import type { KanbanOpportunity } from "./types";

export function getLastActivityAt(opp: KanbanOpportunity): Date | null {
  const times: number[] = [];
  if (opp.updatedAt) times.push(new Date(opp.updatedAt).getTime());
  if (opp.contact?.updatedAt) times.push(new Date(opp.contact.updatedAt).getTime());
  if (opp.contact?.lastConversationAt) {
    times.push(new Date(opp.contact.lastConversationAt).getTime());
  }
  if (!times.length) return null;
  return new Date(Math.max(...times));
}

/** Ex.: "Sem contato há 2 dias" — null se atividade hoje. */
export function formatInactivityLabel(opp: KanbanOpportunity): string | null {
  const last = getLastActivityAt(opp);
  if (!last) return null;

  const diffMs = Date.now() - last.getTime();
  const days = Math.floor(diffMs / 86_400_000);

  if (days < 1) return null;
  if (days === 1) return "Sem contato há 1 dia";
  return `Sem contato há ${days} dias`;
}

export function inactivitySeverity(opp: KanbanOpportunity): "none" | "warn" | "critical" {
  const last = getLastActivityAt(opp);
  if (!last) return "none";
  const days = Math.floor((Date.now() - last.getTime()) / 86_400_000);
  if (days < 2) return "none";
  if (days < 7) return "warn";
  return "critical";
}
