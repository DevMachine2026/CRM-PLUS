import { prisma } from "@/lib/db/client";
import {
  parseTenantAiSettings,
  TONE_LABELS,
  type TenantAiSettings,
} from "@/lib/ai/tenant-settings";

/**
 * Monta o system prompt: persona do tenant (settings.ai) + instrução da tarefa.
 */
export function buildTenantSystemPrompt(
  settings: TenantAiSettings,
  taskInstruction: string,
): string {
  const tone = settings.agentTone
    ? TONE_LABELS[settings.agentTone]
    : "Profissional";

  const parts = [
    settings.systemPrompt.trim(),
    "",
    `Você é ${settings.agentName}, assistente comercial desta empresa (tom: ${tone}).`,
  ];

  if (settings.companyContext?.trim()) {
    parts.push(`Contexto da empresa: ${settings.companyContext.trim()}`);
  }

  parts.push("", "---", "", taskInstruction.trim());

  return parts.join("\n");
}

export async function getTenantAiSystemPrompt(
  tenantId: string,
  taskInstruction: string,
): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const ai = parseTenantAiSettings(tenant?.settings);
  return buildTenantSystemPrompt(ai, taskInstruction);
}
