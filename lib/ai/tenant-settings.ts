import { z } from "zod";

export const tenantAiSettingsSchema = z.object({
  aiEnabled:       z.boolean().optional(),
  agentName:       z.string().min(2, "Nome do agente deve ter pelo menos 2 caracteres.").max(40),
  agentTone:       z.enum(["professional", "friendly", "empathetic", "direct"]).optional(),
  companyContext:  z.string().max(500, "Contexto da empresa: máximo 500 caracteres.").optional(),
  systemPrompt:    z.string().min(20, "Prompt do sistema: mínimo 20 caracteres.").max(4000),
});

export type TenantAiSettings = z.infer<typeof tenantAiSettingsSchema>;

export const TONE_LABELS: Record<NonNullable<TenantAiSettings["agentTone"]>, string> = {
  professional: "Profissional",
  friendly:     "Amigável",
  empathetic:   "Empático",
  direct:       "Direto",
};

export const DEFAULT_AI_SETTINGS: TenantAiSettings = {
  aiEnabled:      false,
  agentName:      "Sara",
  agentTone:      "professional",
  companyContext: "",
  systemPrompt:
    "Você é a Sara, assistente comercial da empresa. Seja objetiva, cordial e focada em qualificar leads e agendar próximos passos. Responda em português do Brasil.",
};

export function parseTenantAiSettings(raw: unknown): TenantAiSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_AI_SETTINGS };
  const ai = (raw as Record<string, unknown>).ai;
  if (!ai || typeof ai !== "object") return { ...DEFAULT_AI_SETTINGS };
  const parsed = tenantAiSettingsSchema.safeParse(ai);
  return parsed.success ? { ...DEFAULT_AI_SETTINGS, ...parsed.data } : { ...DEFAULT_AI_SETTINGS };
}

/** IA nativa ativa (switch em Integrações). Default: false. */
export function isAiEnabled(settings: unknown): boolean {
  return parseTenantAiSettings(settings).aiEnabled === true;
}

export function validateAiField(
  field: keyof TenantAiSettings,
  value: string,
): string | null {
  const partial: Record<string, unknown> = { [field]: value };
  if (field === "agentTone") {
    const r = z.enum(["professional", "friendly", "empathetic", "direct"]).safeParse(value);
    return r.success ? null : "Tom inválido.";
  }
  const shape = tenantAiSettingsSchema.shape[field];
  const r = shape.safeParse(value);
  if (r.success) return null;
  return r.error.issues[0]?.message ?? "Valor inválido.";
}
