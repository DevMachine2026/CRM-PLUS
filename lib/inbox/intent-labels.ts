export type IntentBadgeMeta = {
  label: string;
  color: string;
};

/** Labels curtos para badges no Smart Inbox */
export const INTENT_BADGE: Record<string, IntentBadgeMeta> = {
  quote_request:   { label: "Orçamento",    color: "bg-blue-100 text-blue-700 border-blue-200" },
  scheduling:      { label: "Agendamento",  color: "bg-purple-100 text-purple-700 border-purple-200" },
  complaint:       { label: "Reclamação",   color: "bg-red-100 text-red-700 border-red-200" },
  purchase:        { label: "Compra",       color: "bg-green-100 text-green-700 border-green-200" },
  information:     { label: "Informação",   color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  other:           { label: "Outro",        color: "bg-slate-100 text-slate-600 border-slate-200" },
  urgency:         { label: "Urgência",     color: "bg-orange-100 text-orange-700 border-orange-200" },
  interest:        { label: "Interesse",    color: "bg-green-100 text-green-700 border-green-200" },
  doubt:           { label: "Dúvida",       color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  losing_interest: { label: "Risco",        color: "bg-slate-100 text-slate-600 border-slate-200" },
  neutral:         { label: "Neutro",       color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function getIntentBadge(intent: string | null | undefined): IntentBadgeMeta | null {
  if (!intent || intent === "neutral" || intent === "other" || intent === "information") {
    return null;
  }
  return INTENT_BADGE[intent] ?? { label: intent, color: "bg-slate-100 text-slate-600 border-slate-200" };
}
