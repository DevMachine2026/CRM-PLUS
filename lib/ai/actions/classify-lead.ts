import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";
import { getTenantAiSystemPrompt } from "@/lib/ai/tenant-prompt";
import { emitOpportunityCreated } from "@/lib/automations/emit";
import { ensureDefaultPipeline } from "@/lib/db/ensure-default-pipeline";
import { detectStageAdvance } from "@/lib/ai/actions/detect-stage-advance";

// ── Strategic qualification schema (webhook + CRM) ───────────────────────────

export type LeadIntent =
  | "quote_request"
  | "scheduling"
  | "complaint"
  | "information"
  | "purchase"
  | "other";

export type LeadUrgency = "high" | "medium" | "low";
export type BudgetSignal = "high" | "medium" | "low" | "unknown";

export type SuggestedStage =
  | "lead"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export interface LeadQualification {
  summary:            string;
  intent:             LeadIntent;
  urgency:            LeadUrgency;
  budgetSignal:       BudgetSignal;
  leadScore:          number;
  createOpportunity:  boolean;
  suggestedStage:     SuggestedStage;
  nextBestAction:     string;
  priorityScore:      number;
  tags:               string[];
  reasoning:          string;
}

export interface ClassifyLeadInput {
  contactId:        string;
  tenantId:         string;
  userId?:          string;
  name:             string;
  email?:           string | null;
  phone?:           string | null;
  companyId?:       string | null;
  hasOpportunity?:  boolean;
  conversationId?:  string;
  /** Latest inbound message (webhook) */
  lastMessage?:     string;
  /** Recent thread for context */
  recentMessages?:  { direction: string; content: string }[];
}

/** Backward-compatible tier for automations / suggest-next-action */
export interface ClassifyLeadResult extends LeadQualification {
  classification: "hot" | "warm" | "cold";
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
Você é um especialista em qualificação comercial para pequenos negócios brasileiros (WhatsApp/Instagram).
Analise o contato e as mensagens recentes do CLIENTE e retorne APENAS JSON válido neste formato exato:
{
  "summary": "resumo em 1 linha em português",
  "intent": "quote_request" | "scheduling" | "complaint" | "information" | "purchase" | "other",
  "urgency": "high" | "medium" | "low",
  "budgetSignal": "high" | "medium" | "low" | "unknown",
  "leadScore": <inteiro 0-100, potencial de fechamento>,
  "createOpportunity": <true se deve abrir oportunidade no funil>,
  "suggestedStage": "lead" | "qualification" | "proposal" | "negotiation" | "closed_won" | "closed_lost",
  "nextBestAction": "ação concreta para o vendedor, ex: Enviar proposta de 3x sem juros",
  "priorityScore": <inteiro 0-100, prioridade para ordenar inbox — combine urgência + intenção + budget>,
  "tags": ["tag1", "tag2"],
  "reasoning": "explicação curta da decisão"
}
Regras:
- intent "quote_request": pede preço, orçamento, proposta
- intent "purchase": quer comprar/contratar agora
- intent "complaint": reclamação ou problema
- priorityScore alto (70+) = responder hoje; baixo = pode aguardar
- createOpportunity true quando há intenção comercial clara (quote_request, purchase, scheduling com interesse)
- tags curtas em português: ex "quente", "orcamento", "decisor", "urgente"
Responda APENAS com o JSON, sem markdown.`;

const VALID_INTENTS: LeadIntent[] = [
  "quote_request", "scheduling", "complaint", "information", "purchase", "other",
];
const VALID_URGENCY: LeadUrgency[] = ["high", "medium", "low"];
const VALID_BUDGET: BudgetSignal[] = ["high", "medium", "low", "unknown"];
const VALID_STAGES: SuggestedStage[] = [
  "lead", "qualification", "proposal", "negotiation", "closed_won", "closed_lost",
];

const STAGE_NAME_PATTERNS: Record<SuggestedStage, RegExp[]> = {
  lead:           [/prospec/i, /^lead$/i],
  qualification:  [/qualific/i],
  proposal:       [/proposta/i],
  negotiation:    [/negoci/i],
  closed_won:     [/fechamento/i, /ganho/i, /won/i],
  closed_lost:    [/perdido/i, /lost/i],
};

function buildPrompt(input: ClassifyLeadInput): string {
  const freeEmailDomains = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"];
  const emailDomain      = input.email?.split("@")[1] ?? "";
  const isCorporate      = input.email ? !freeEmailDomains.includes(emailDomain.toLowerCase()) : false;

  const lines: string[] = [
    "Dados do contato:",
    `- Nome: ${input.name}`,
    `- Email: ${input.email ?? "não informado"}${isCorporate ? " (corporativo)" : ""}`,
    `- Telefone: ${input.phone ?? "não informado"}`,
    `- Empresa vinculada: ${input.companyId ? "sim" : "não"}`,
    `- Oportunidade ativa: ${input.hasOpportunity ? "sim" : "não"}`,
  ];

  if (input.lastMessage) {
    lines.push("", `Última mensagem do cliente: "${input.lastMessage}"`);
  }

  if (input.recentMessages?.length) {
    const thread = input.recentMessages
      .map((m) => `[${m.direction === "inbound" ? "cliente" : "atendente"}] ${m.content}`)
      .join("\n");
    lines.push("", `Histórico recente (${input.recentMessages.length} msgs):`, thread);
  }

  lines.push("", "Qualifique estrategicamente este lead.");
  return lines.join("\n");
}

function scoreToClassification(score: number): ClassifyLeadResult["classification"] {
  if (score >= 70) return "hot";
  if (score >= 35) return "warm";
  return "cold";
}

function clampScore(n: unknown): number {
  return Math.min(100, Math.max(0, Math.round(Number(n) || 0)));
}

function normalizeQualification(raw: Partial<LeadQualification>): LeadQualification {
  const leadScore     = clampScore(raw.leadScore);
  const priorityScore = clampScore(raw.priorityScore ?? raw.leadScore);

  return {
    summary:           String(raw.summary ?? "").slice(0, 200),
    intent:            VALID_INTENTS.includes(raw.intent as LeadIntent)
      ? (raw.intent as LeadIntent) : "other",
    urgency:           VALID_URGENCY.includes(raw.urgency as LeadUrgency)
      ? (raw.urgency as LeadUrgency) : "medium",
    budgetSignal:      VALID_BUDGET.includes(raw.budgetSignal as BudgetSignal)
      ? (raw.budgetSignal as BudgetSignal) : "unknown",
    leadScore,
    createOpportunity: Boolean(raw.createOpportunity),
    suggestedStage:    VALID_STAGES.includes(raw.suggestedStage as SuggestedStage)
      ? (raw.suggestedStage as SuggestedStage) : "lead",
    nextBestAction:    String(raw.nextBestAction ?? "Retomar contato com o lead").slice(0, 200),
    priorityScore,
    tags:              Array.isArray(raw.tags) ? raw.tags.map(String).slice(0, 8) : [],
    reasoning:         String(raw.reasoning ?? "").slice(0, 300),
  };
}

// ── Mock fallback (message-aware) ───────────────────────────────────────────

function mockClassify(input: ClassifyLeadInput): LeadQualification {
  const text = [
    input.lastMessage ?? "",
    ...(input.recentMessages ?? []).map((m) => m.content),
  ].join(" ").toLowerCase();

  let intent: LeadIntent = "information";
  let urgency: LeadUrgency = "low";
  let budgetSignal: BudgetSignal = "unknown";
  let createOpportunity = false;
  let suggestedStage: SuggestedStage = "lead";
  let leadScore = 15;
  let priorityScore = 20;
  const tags: string[] = [];

  if (/orçamento|orcamento|preço|preco|quanto custa|proposta/.test(text)) {
    intent = "quote_request";
    urgency = "high";
    budgetSignal = "medium";
    createOpportunity = true;
    suggestedStage = "proposal";
    leadScore = 72;
    priorityScore = 78;
    tags.push("orcamento", "quente");
  } else if (/agendar|horário|horario|visita|reunião|reuniao/.test(text)) {
    intent = "scheduling";
    urgency = "medium";
    createOpportunity = true;
    suggestedStage = "qualification";
    leadScore = 58;
    priorityScore = 55;
    tags.push("agendamento");
  } else if (/reclama|problema|não funciona|nao funciona|insatisfeito/.test(text)) {
    intent = "complaint";
    urgency = "high";
    suggestedStage = "lead";
    leadScore = 40;
    priorityScore = 85;
    tags.push("reclamação");
  } else if (/quero comprar|fechar|contratar|vou fechar|pode mandar o link/.test(text)) {
    intent = "purchase";
    urgency = "high";
    budgetSignal = "high";
    createOpportunity = true;
    suggestedStage = "negotiation";
    leadScore = 88;
    priorityScore = 92;
    tags.push("quente", "decisor");
  } else if (/interesse|gostei|quero saber/.test(text)) {
    intent = "information";
    urgency = "medium";
    leadScore = 45;
    priorityScore = 42;
    tags.push("interesse");
  }

  if (input.email) leadScore = Math.min(100, leadScore + 10);
  if (input.phone) leadScore = Math.min(100, leadScore + 10);
  if (input.hasOpportunity) {
    leadScore = Math.min(100, leadScore + 15);
    createOpportunity = false;
  }
  if (input.companyId) leadScore = Math.min(100, leadScore + 8);

  if (!tags.length && leadScore >= 70) tags.push("quente");
  if (!tags.length && leadScore >= 35) tags.push("morno");

  const nextBestAction =
    intent === "quote_request" ? "Enviar proposta com condições de pagamento"
    : intent === "purchase"     ? "Confirmar fechamento e enviar contrato/link"
    : intent === "complaint"    ? "Ligar hoje e resolver a reclamação"
    : intent === "scheduling"   ? "Confirmar horário da visita/reunião"
    : "Retomar contato e qualificar necessidade";

  return normalizeQualification({
    summary: `[mock] ${intent} — score ${leadScore}`,
    intent,
    urgency,
    budgetSignal,
    leadScore,
    createOpportunity,
    suggestedStage,
    nextBestAction,
    priorityScore,
    tags,
    reasoning: `[mock] Análise por padrões na mensagem e dados do contato.`,
  });
}

// ── Pipeline helpers ──────────────────────────────────────────────────────────

async function resolvePipelineStage(
  tenantId: string,
  suggested: SuggestedStage
): Promise<{ pipelineId: string; stageId: string } | null> {
  // Garante que o pipeline default "Vendas" exista antes de resolver o estágio —
  // o webhook pode classificar um lead antes de qualquer visita à tela de Oportunidades.
  await ensureDefaultPipeline(tenantId);

  const pipeline = await prisma.pipeline.findFirst({
    where:   { tenantId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (!pipeline?.stages.length) return null;

  const patterns = STAGE_NAME_PATTERNS[suggested];
  const stage =
    pipeline.stages.find((s) => patterns.some((p) => p.test(s.name)))
    ?? pipeline.stages[0];

  return { pipelineId: pipeline.id, stageId: stage.id };
}

async function ensureOpportunity(
  input: ClassifyLeadInput,
  q: LeadQualification
): Promise<string | null> {
  if (!q.createOpportunity) return null;

  const existing = await prisma.opportunity.findFirst({
    where: { tenantId: input.tenantId, contactId: input.contactId, status: "open" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const resolved = await resolvePipelineStage(input.tenantId, q.suggestedStage);
  if (!resolved) return null;

  const status =
    q.suggestedStage === "closed_won" ? "won"
    : q.suggestedStage === "closed_lost" ? "lost"
    : "open";

  const opp = await prisma.opportunity.create({
    data: {
      tenantId:   input.tenantId,
      contactId:  input.contactId,
      companyId:  input.companyId ?? null,
      pipelineId: resolved.pipelineId,
      stageId:    resolved.stageId,
      title:      `${input.name} — ${q.summary.slice(0, 60)}`,
      status,
      notes:      q.reasoning,
    },
  });

  emitOpportunityCreated(input.tenantId, {
    id:        opp.id,
    title:     opp.title,
    status:    opp.status,
    stageId:   resolved.stageId,
    contactId: input.contactId,
  });

  return opp.id;
}

async function ensureAiTask(
  input: ClassifyLeadInput,
  q: LeadQualification,
  opportunityId: string | null
): Promise<void> {
  if (!q.nextBestAction.trim()) return;

  const marker = input.conversationId
    ? `conv:${input.conversationId}`
    : `contact:${input.contactId}`;

  const existing = await prisma.task.findFirst({
    where: {
      tenantId: input.tenantId,
      source:   "ai",
      status:   "pending",
      description: { contains: marker },
    },
  });
  if (existing) return;

  const priority: "high" | "medium" | "low" =
    q.urgency === "high" ? "high" : q.urgency === "medium" ? "medium" : "low";

  const dueAt = new Date();
  dueAt.setHours(dueAt.getHours() + (q.urgency === "high" ? 4 : q.urgency === "medium" ? 24 : 72));

  await prisma.task.create({
    data: {
      tenantId:      input.tenantId,
      contactId:     input.contactId,
      opportunityId: opportunityId ?? null,
      title:         q.nextBestAction.slice(0, 120),
      description:   `${marker} — ${q.reasoning}`,
      dueAt,
      status:        "pending",
      priority,
      source:        "ai",
    },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function classifyLead(input: ClassifyLeadInput): Promise<ClassifyLeadResult> {
  let qualification: LeadQualification;
  let modelProvider = "mock";
  let modelId       = "mock-v3-strategic";
  let outputTokens  = 0;
  let fallbackReason: string | null = null;

  const hasOpportunity = input.hasOpportunity ?? await prisma.opportunity.findFirst({
    where: { tenantId: input.tenantId, contactId: input.contactId, status: "open" },
    select: { id: true },
  }).then(Boolean);

  const enrichedInput = { ...input, hasOpportunity };

  try {
    const system = await getTenantAiSystemPrompt(input.tenantId, SYSTEM_PROMPT);
    const aiResult = await aiComplete({
      system,
      user:      buildPrompt(enrichedInput),
      maxTokens: 450,
      tier:      "fast",
    });

    const parsed = parseAIJson<LeadQualification>(aiResult.text);
    qualification = normalizeQualification(parsed);

    modelProvider = aiResult.provider;
    modelId       = aiResult.modelId;
    outputTokens  = aiResult.outputTokens;
  } catch (err) {
    fallbackReason = err instanceof Error ? err.message : "unknown error";
    console.error("[ai] classifyLead: fallback para mock —", fallbackReason);
    qualification = mockClassify(enrichedInput);
  }

  const result: ClassifyLeadResult = {
    ...qualification,
    classification: scoreToClassification(qualification.leadScore),
  };

  const opportunityId = await ensureOpportunity(enrichedInput, qualification);

  await prisma.$transaction(async (tx) => {
    await tx.contact.update({
      where: { id: input.contactId },
      data:  { leadScore: qualification.priorityScore },
    });

    if (input.conversationId) {
      await tx.conversation.update({
        where: { id: input.conversationId, tenantId: input.tenantId },
        data: {
          summaryText:    qualification.summary,
          detectedIntent: qualification.intent,
          priorityScore:  qualification.priorityScore,
          nextBestAction: qualification.nextBestAction,
        },
      });
    }

    for (const tagName of qualification.tags) {
      const tag = await tx.tag.findFirst({
        where: {
          tenantId: input.tenantId,
          name: { equals: tagName, mode: "insensitive" },
        },
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
        entityType:       input.conversationId ? "conversation" : "contact",
        entityId:         input.conversationId ?? input.contactId,
        action:           "classify_lead",
        modelProvider,
        modelId,
        promptTokens:     120,
        completionTokens: outputTokens,
        inputSummary:     `name=${input.name}, msgs=${input.recentMessages?.length ?? 0}, last=${!!input.lastMessage}`,
        outputSummary:    JSON.stringify({
          intent: qualification.intent,
          leadScore: qualification.leadScore,
          priorityScore: qualification.priorityScore,
          createOpportunity: qualification.createOpportunity,
          suggestedStage: qualification.suggestedStage,
          nextBestAction: qualification.nextBestAction,
          fallback: fallbackReason ?? undefined,
        }),
      },
    });
  });

  await ensureAiTask(input, qualification, opportunityId);

  // Avanço automático de estágio no Kanban: após classificar, a IA reavalia se a
  // oportunidade aberta deste contato deve avançar de coluna (criada agora ou já existente).
  try {
    const openOppId =
      opportunityId ??
      (await prisma.opportunity.findFirst({
        where:  { tenantId: input.tenantId, contactId: input.contactId, status: "open" },
        select: { id: true },
      }))?.id ??
      null;

    if (openOppId) {
      await detectStageAdvance({
        opportunityId: openOppId,
        tenantId:      input.tenantId,
        userId:        input.userId,
      });
    }
  } catch (err) {
    console.error("[ai] detectStageAdvance falhou —", err instanceof Error ? err.message : err);
  }

  return result;
}
