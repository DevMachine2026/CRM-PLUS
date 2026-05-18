import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";

export interface AutoTagInput {
  contactId:     string;
  tenantId:      string;
  userId?:       string;
  name:          string;
  email?:        string | null;
  phone?:        string | null;
  companyName?:  string | null;
  existingTags?: string[];
  recentMessages?: string[];
  opportunityTitles?: string[];
}

export interface AutoTagResult {
  suggestedTags:  string[];
  appliedTags:    string[];
  justification:  string;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
Você é um especialista em categorização de contatos comerciais no Brasil.
Analise os dados do contato e sugira tags relevantes para segmentação.
Responda APENAS com JSON válido no formato:
{
  "tags": ["tag1", "tag2", "tag3"],
  "justification": "motivo em 1 frase"
}
Regras:
- Sugira de 1 a 5 tags que ajudem a segmentar e qualificar o contato
- Use tags curtas (máx 30 caracteres), em minúsculas, sem acentos quando possível
- Exemplos úteis: "cliente-ativo", "e-commerce", "b2b", "interessado-em-produto-x", "reengajamento", "vip", "churning", "onboarding", "suporte-frequente", "alto-valor", "pequena-empresa"
- Não repita tags já existentes no contato
- Baseie-se no contexto: nome, empresa, mensagens recentes, oportunidades
Responda APENAS com o JSON, sem markdown.`;

function buildPrompt(input: AutoTagInput): string {
  const parts: string[] = [
    `Nome: ${input.name}`,
    `Email: ${input.email ?? "não informado"}`,
    `Telefone: ${input.phone ?? "não informado"}`,
    `Empresa: ${input.companyName ?? "não informado"}`,
  ];

  if (input.existingTags?.length) {
    parts.push(`Tags atuais (NÃO repetir): ${input.existingTags.join(", ")}`);
  }

  if (input.opportunityTitles?.length) {
    parts.push(`Oportunidades: ${input.opportunityTitles.slice(0, 3).join("; ")}`);
  }

  if (input.recentMessages?.length) {
    parts.push(`Mensagens recentes:\n${input.recentMessages.slice(0, 5).map((m) => `- ${m}`).join("\n")}`);
  }

  return `Dados do contato:\n${parts.join("\n")}\n\nSugira tags relevantes para segmentação.`;
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

function mockAutoTag(input: AutoTagInput): AutoTagResult {
  const tags: string[] = [];
  const existing = new Set(input.existingTags ?? []);

  const freeEmailDomains = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"];
  if (input.email) {
    const domain = input.email.split("@")[1] ?? "";
    if (!freeEmailDomains.includes(domain.toLowerCase())) {
      if (!existing.has("email-corporativo")) tags.push("email-corporativo");
    }
  }

  if (input.companyName && !existing.has("b2b")) tags.push("b2b");
  if (!input.email && !input.phone && !existing.has("dados-incompletos")) tags.push("dados-incompletos");
  if (input.opportunityTitles?.length && !existing.has("em-negociacao")) tags.push("em-negociacao");

  const msgText = (input.recentMessages ?? []).join(" ").toLowerCase();
  if (/urgente|rapido|hoje/.test(msgText) && !existing.has("urgente")) tags.push("urgente");
  if (/reclamacao|problema|erro/.test(msgText) && !existing.has("suporte")) tags.push("suporte");

  return {
    suggestedTags: tags,
    appliedTags: [],
    justification: `[mock] Tags baseadas em heurísticas: email=${!!input.email}, empresa=${!!input.companyName}`,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function autoTag(input: AutoTagInput): Promise<AutoTagResult> {
  let suggestedTags: string[];
  let justification: string;
  let modelProvider = "mock";
  let modelId       = "mock-v2";
  let outputTokens  = 0;

  try {
    const aiResult = await aiComplete({
      system:    SYSTEM_PROMPT,
      user:      buildPrompt(input),
      maxTokens: 200,
      tier:      "fast",
    });

    const parsed = parseAIJson<{ tags: string[]; justification: string }>(aiResult.text);

    suggestedTags = Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).toLowerCase().trim().slice(0, 30)).filter(Boolean)
      : [];
    justification  = String(parsed.justification).slice(0, 200);
    modelProvider  = aiResult.provider;
    modelId        = aiResult.modelId;
    outputTokens   = aiResult.outputTokens;
  } catch {
    const mock = mockAutoTag(input);
    suggestedTags = mock.suggestedTags;
    justification = mock.justification;
  }

  // ── Upsert tags + apply to contact (skip existing) ────────────────────────
  const existing = new Set(input.existingTags ?? []);
  const newTags  = suggestedTags.filter((t) => !existing.has(t));
  const applied: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const tagName of newTags) {
      const tag = await tx.tag.upsert({
        where:  { tenantId_name: { tenantId: input.tenantId, name: tagName } },
        create: { tenantId: input.tenantId, name: tagName },
        update: {},
      });

      await tx.contactTag.upsert({
        where:  { contactId_tagId: { contactId: input.contactId, tagId: tag.id } },
        create: { contactId: input.contactId, tagId: tag.id },
        update: {},
      });

      applied.push(tagName);
    }

    await tx.aiLog.create({
      data: {
        tenantId:         input.tenantId,
        userId:           input.userId ?? null,
        entityType:       "contact",
        entityId:         input.contactId,
        action:           "auto_tag",
        modelProvider,
        modelId,
        promptTokens:     80,
        completionTokens: outputTokens,
        inputSummary:     `name=${input.name}, existing_tags=${(input.existingTags ?? []).length}`,
        outputSummary:    `suggested=${suggestedTags.length}, applied=${applied.length}: ${applied.join(",")}`,
      },
    });
  });

  return { suggestedTags, appliedTags: applied, justification };
}
