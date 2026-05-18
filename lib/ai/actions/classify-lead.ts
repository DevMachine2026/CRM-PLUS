import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";
import { getTenantAiSystemPrompt } from "@/lib/ai/tenant-prompt";

export interface ClassifyLeadInput {
  contactId:       string;
  tenantId:        string;
  userId?:         string;
  name:            string;
  email?:          string | null;
  phone?:          string | null;
  companyId?:      string | null;
  hasOpportunity?: boolean;
}

export interface ClassifyLeadResult {
  score:           number;
  classification:  "hot" | "warm" | "cold";
  suggestedStatus: "lead" | "customer" | "inactive";
  followUpDays:    number;
  tags:            string[];
  justification:   string;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
Você é um especialista em qualificação de leads para empresas brasileiras B2B e B2C.
Analise os dados do contato e retorne APENAS JSON válido no formato:
{
  "score": <inteiro 0-100>,
  "classification": "hot" | "warm" | "cold",
  "suggestedStatus": "lead" | "customer" | "inactive",
  "followUpDays": <inteiro: dias recomendados para próximo contato>,
  "tags": ["tag1", "tag2"],
  "justification": "motivo em 1 frase"
}
Critérios de classificação:
- "hot" (score 70-100): email corporativo + telefone + empresa + oportunidade ativa
- "warm" (score 35-69): tem email ou telefone, algum dado empresarial
- "cold" (score 0-34): dados mínimos, email genérico, sem empresa
Tags disponíveis: "lead quente", "lead morno", "dados incompletos", "email corporativo", "vinculado a empresa", "oportunidade ativa"
Responda APENAS com o JSON, sem markdown.`;

function buildPrompt(input: ClassifyLeadInput): string {
  const freeEmailDomains = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"];
  const emailDomain      = input.email?.split("@")[1] ?? "";
  const isCorporate      = input.email ? !freeEmailDomains.includes(emailDomain.toLowerCase()) : false;

  return `Dados do contato:
- Nome: ${input.name}
- Email: ${input.email ?? "não informado"}${isCorporate ? " (corporativo)" : " (pessoal)"}
- Telefone: ${input.phone ?? "não informado"}
- Empresa vinculada: ${input.companyId ? "sim" : "não"}
- Oportunidade ativa: ${input.hasOpportunity ? "sim" : "não"}
Classifique este lead.`;
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

function mockClassify(input: ClassifyLeadInput): ClassifyLeadResult {
  let score = 10;
  if (input.email) score += 20;
  if (input.phone) score += 20;
  if (input.companyId) score += 15;
  if (input.hasOpportunity) score += 25;
  const freeEmailDomains = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"];
  if (input.email) {
    const domain = input.email.split("@")[1] ?? "";
    if (!freeEmailDomains.includes(domain.toLowerCase())) score += 10;
  }
  score = Math.min(score, 100);
  const classification = score >= 55 ? "hot" : score >= 25 ? "warm" : "cold";
  const tags: string[] = [];
  if (classification === "hot") tags.push("lead quente");
  if (classification === "warm") tags.push("lead morno");
  if (!input.email && !input.phone) tags.push("dados incompletos");
  if (input.companyId) tags.push("vinculado a empresa");
  if (input.hasOpportunity) tags.push("oportunidade ativa");
  return {
    score,
    classification,
    suggestedStatus: input.hasOpportunity ? "customer" : "lead",
    followUpDays: classification === "hot" ? 1 : classification === "warm" ? 3 : 7,
    tags,
    justification: `[mock] score=${score} (email:${!!input.email}, phone:${!!input.phone}, company:${!!input.companyId})`,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function classifyLead(input: ClassifyLeadInput): Promise<ClassifyLeadResult> {
  let result: ClassifyLeadResult;
  let modelProvider = "mock";
  let modelId       = "mock-v2";
  let outputTokens  = 0;

  try {
    const system = await getTenantAiSystemPrompt(input.tenantId, SYSTEM_PROMPT);
    const aiResult = await aiComplete({
      system,
      user:      buildPrompt(input),
      maxTokens: 250,
      tier:      "fast",
    });

    const parsed = parseAIJson<{
      score:           number;
      classification:  string;
      suggestedStatus: string;
      followUpDays:    number;
      tags:            string[];
      justification:   string;
    }>(aiResult.text);

    const VALID_CLASS  = ["hot", "warm", "cold"] as const;
    const VALID_STATUS = ["lead", "customer", "inactive"] as const;
    if (!VALID_CLASS.includes(parsed.classification as typeof VALID_CLASS[number])) {
      throw new Error("unexpected-ai-shape");
    }

    result = {
      score:           Math.min(100, Math.max(0, Math.round(Number(parsed.score)))),
      classification:  parsed.classification as ClassifyLeadResult["classification"],
      suggestedStatus: VALID_STATUS.includes(parsed.suggestedStatus as typeof VALID_STATUS[number])
        ? parsed.suggestedStatus as ClassifyLeadResult["suggestedStatus"]
        : "lead",
      followUpDays:    Math.max(1, Math.round(Number(parsed.followUpDays))),
      tags:            Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      justification:   String(parsed.justification).slice(0, 200),
    };
    modelProvider = aiResult.provider;
    modelId       = aiResult.modelId;
    outputTokens  = aiResult.outputTokens;
  } catch {
    result = mockClassify(input);
  }

  // ── Persist leadScore + apply tags + AiLog (single transaction) ───────────
  await prisma.$transaction(async (tx) => {
    await tx.contact.update({
      where: { id: input.contactId },
      data:  { leadScore: result.score },
    });

    for (const tagName of result.tags) {
      const tag = await tx.tag.findFirst({
        where: { tenantId: input.tenantId, name: tagName },
      });
      if (!tag) continue;
      await tx.contactTag.upsert({
        where:  { contactId_tagId: { contactId: input.contactId, tagId: tag.id } },
        update: {},
        create: { contactId: input.contactId, tagId: tag.id },
      });
    }

    await tx.aiLog.create({
      data: {
        tenantId:         input.tenantId,
        userId:           input.userId ?? null,
        entityType:       "contact",
        entityId:         input.contactId,
        action:           "classify_lead",
        modelProvider,
        modelId,
        promptTokens:     60,
        completionTokens: outputTokens,
        inputSummary:     `name=${input.name}, email=${!!input.email}, phone=${!!input.phone}`,
        outputSummary:    `score=${result.score}, class=${result.classification}, tags=${result.tags.join(",")}`,
      },
    });
  });

  return result;
}
