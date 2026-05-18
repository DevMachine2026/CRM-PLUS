import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";

export interface DetectStageAdvanceInput {
  opportunityId:  string;
  tenantId:       string;
  userId?:        string;
}

export interface DetectStageAdvanceResult {
  shouldAdvance:   boolean;
  targetStageId:   string | null;
  targetStageName: string | null;
  confidence:      number;
  reason:          string;
  moved:           boolean;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
Você é um especialista em gestão de pipeline de vendas para empresas brasileiras.
Analise os dados de uma oportunidade comercial e decida se ela deve avançar para a próxima etapa do pipeline.
Responda APENAS com JSON válido no formato:
{
  "shouldAdvance": true | false,
  "confidence": <inteiro 0-100>,
  "reason": "justificativa em 1 frase (máx 150 caracteres)"
}
Critérios para avançar (shouldAdvance=true):
- Contato com alta pontuação (lead quente) demonstrou interesse recente
- Última mensagem do contato indica pedido de proposta, negociação ou urgência
- Há oportunidade de alto valor com alto score de contato
- Intenção detectada é "interest", "quote_request" ou "urgency"
Critérios para NÃO avançar:
- Contato está "losing_interest" ou sem mensagens recentes
- Etapa atual já é a final
- Probabilidade da etapa atual é ≥ 75%
Responda APENAS com o JSON, sem markdown.`;

function buildPrompt(data: {
  opportunityTitle:   string;
  opportunityValue:   number | null;
  currentStageName:   string;
  currentProbability: number;
  isLastStage:        boolean;
  nextStageName:      string | null;
  contactName:        string | null;
  leadScore:          number;
  detectedIntent:     string | null;
  lastMessagePreview: string | null;
  daysSinceLastMsg:   number | null;
}): string {
  return `Oportunidade: ${data.opportunityTitle}
Valor: ${data.opportunityValue != null ? `R$ ${data.opportunityValue.toFixed(2)}` : "não definido"}
Etapa atual: ${data.currentStageName} (probabilidade ${data.currentProbability}%)
Próxima etapa: ${data.nextStageName ?? "não há — etapa final"}
É a última etapa: ${data.isLastStage ? "sim" : "não"}
Contato: ${data.contactName ?? "não vinculado"} | Score: ${data.leadScore}/100
Intenção detectada: ${data.detectedIntent ?? "não detectada"}
Última mensagem: ${data.lastMessagePreview ?? "nenhuma"}
Dias desde última mensagem: ${data.daysSinceLastMsg ?? "desconhecido"}
Devo mover para a próxima etapa?`;
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

function mockDetectStageAdvance(data: {
  currentProbability: number;
  isLastStage:        boolean;
  leadScore:          number;
  detectedIntent:     string | null;
  daysSinceLastMsg:   number | null;
}): { shouldAdvance: boolean; confidence: number; reason: string } {
  if (data.isLastStage || data.currentProbability >= 75) {
    return { shouldAdvance: false, confidence: 90, reason: "[mock] Etapa final ou probabilidade já alta." };
  }

  const positiveIntents = ["interest", "quote_request", "urgency"];
  const hasPositiveIntent = positiveIntents.includes(data.detectedIntent ?? "");
  const isHotLead        = data.leadScore >= 70;
  const recentEngagement = (data.daysSinceLastMsg ?? 99) <= 2;

  if (hasPositiveIntent && isHotLead) {
    return { shouldAdvance: true, confidence: 85, reason: "[mock] Lead quente com intenção positiva detectada." };
  }
  if (hasPositiveIntent && recentEngagement) {
    return { shouldAdvance: true, confidence: 70, reason: "[mock] Intenção positiva com engajamento recente." };
  }

  return { shouldAdvance: false, confidence: 60, reason: "[mock] Condições insuficientes para avançar." };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function detectStageAdvance(
  input: DetectStageAdvanceInput
): Promise<DetectStageAdvanceResult> {

  // ── Load opportunity + pipeline context ──────────────────────────────────────
  const opp = await prisma.opportunity.findFirst({
    where:   { id: input.opportunityId, tenantId: input.tenantId },
    include: {
      contact: { select: { id: true, name: true, leadScore: true } },
      stage:   true,
      pipeline: {
        include: {
          stages: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!opp) {
    return { shouldAdvance: false, targetStageId: null, targetStageName: null, confidence: 0, reason: "Oportunidade não encontrada", moved: false };
  }

  const stages       = opp.pipeline.stages;
  const currentStage = opp.stage;
  const nextStage    = stages.find((s: { order: number }) => s.order === currentStage.order + 1) ?? null;
  const isLastStage  = nextStage === null;

  // Conversations are on contact, not opportunity — fetch separately
  const latestConv = opp.contact
    ? await prisma.conversation.findFirst({
        where:   { contactId: opp.contact.id, tenantId: input.tenantId },
        orderBy: { lastMessageAt: "desc" },
        select:  {
          detectedIntent: true,
          messages: {
            take:    1,
            orderBy: { sentAt: "desc" },
            where:   { direction: "inbound" },
            select:  { content: true, sentAt: true },
          },
        },
      })
    : null;

  const latestMsg      = latestConv?.messages[0] ?? null;
  const daysSinceLastMsg = latestMsg
    ? Math.floor((Date.now() - latestMsg.sentAt.getTime()) / 86_400_000)
    : null;

  const promptData = {
    opportunityTitle:   opp.title,
    opportunityValue:   opp.value != null ? Number(opp.value) : null,
    currentStageName:   currentStage.name,
    currentProbability: currentStage.probability,
    isLastStage,
    nextStageName:      nextStage?.name ?? null,
    contactName:        opp.contact?.name ?? null,
    leadScore:          opp.contact?.leadScore ?? 0,
    detectedIntent:     latestConv?.detectedIntent ?? null,
    lastMessagePreview: latestMsg ? latestMsg.content.slice(0, 100) : null,
    daysSinceLastMsg,
  };

  // ── AI inference ──────────────────────────────────────────────────────────────
  let shouldAdvance: boolean;
  let confidence:    number;
  let reason:        string;
  let modelProvider  = "mock";
  let modelId        = "mock-v2";
  let outputTokens   = 0;

  try {
    const aiResult = await aiComplete({
      system:    SYSTEM_PROMPT,
      user:      buildPrompt(promptData),
      maxTokens: 200,
      tier:      "fast",
    });

    const parsed = parseAIJson<{
      shouldAdvance: boolean;
      confidence:    number;
      reason:        string;
    }>(aiResult.text);

    shouldAdvance = Boolean(parsed.shouldAdvance);
    confidence    = Math.min(100, Math.max(0, Math.round(Number(parsed.confidence))));
    reason        = String(parsed.reason).slice(0, 200);
    modelProvider = aiResult.provider;
    modelId       = aiResult.modelId;
    outputTokens  = aiResult.outputTokens;
  } catch {
    const mock = mockDetectStageAdvance({
      currentProbability: currentStage.probability,
      isLastStage,
      leadScore:          opp.contact?.leadScore ?? 0,
      detectedIntent:     latestConv?.detectedIntent ?? null,
      daysSinceLastMsg,
    });
    shouldAdvance = mock.shouldAdvance;
    confidence    = mock.confidence;
    reason        = mock.reason;
  }

  // ── Move card if appropriate ──────────────────────────────────────────────────
  let moved = false;

  if (shouldAdvance && nextStage && confidence >= 65) {
    await prisma.opportunity.update({
      where: { id: input.opportunityId },
      data:  { stageId: nextStage.id },
    });
    moved = true;
  }

  // ── Persist AI log ────────────────────────────────────────────────────────────
  await prisma.aiLog.create({
    data: {
      tenantId:         input.tenantId,
      userId:           input.userId ?? null,
      entityType:       "opportunity",
      entityId:         input.opportunityId,
      action:           "detect_stage_advance",
      modelProvider,
      modelId,
      promptTokens:     120,
      completionTokens: outputTokens,
      inputSummary:     `opp=${opp.title}, stage=${currentStage.name}, score=${opp.contact?.leadScore ?? 0}`,
      outputSummary:    `advance=${shouldAdvance}, confidence=${confidence}%, moved=${moved}, target=${nextStage?.name ?? "none"}`,
    },
  });

  return {
    shouldAdvance,
    targetStageId:   nextStage?.id ?? null,
    targetStageName: nextStage?.name ?? null,
    confidence,
    reason,
    moved,
  };
}
