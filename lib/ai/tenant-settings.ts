import { z } from "zod";

export const tenantAiSettingsSchema = z.object({
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
  agentName:      "Sara",
  agentTone:      "professional",
  companyContext: "",
  systemPrompt:
    "Você é uma assistente comercial da empresa. Seja objetiva, cordial e focada em avançar o lead no funil. Sempre responda em português do Brasil.",
};

export function parseTenantAiSettings(raw: unknown): TenantAiSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_AI_SETTINGS };
  const ai = (raw as Record<string, unknown>).ai;
  if (!ai || typeof ai !== "object") return { ...DEFAULT_AI_SETTINGS };
  const parsed = tenantAiSettingsSchema.safeParse(ai);
  return parsed.success ? parsed.data : { ...DEFAULT_AI_SETTINGS };
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
