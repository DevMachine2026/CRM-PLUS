/** Score mínimo para o filtro padrão "Prioridade Alta" */
export const HIGH_PRIORITY_MIN = 60;

/** Score mínimo para contagem "Quentes hoje" */
export const HOT_PRIORITY_MIN = 80;

export type PriorityTier = "high" | "medium" | "low";

export function effectivePriorityScore(
  conversationScore: number,
  contactLeadScore?: number | null
): number {
  return Math.max(conversationScore, contactLeadScore ?? 0);
}

export function priorityTier(score: number): PriorityTier {
  if (score > 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

export function priorityScoreClasses(score: number): string {
  const tier = priorityTier(score);
  if (tier === "high") return "bg-green-100 text-green-700 border-green-200";
  if (tier === "medium") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}
