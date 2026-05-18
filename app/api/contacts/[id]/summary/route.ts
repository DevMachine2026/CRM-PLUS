import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden} from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";

const SYSTEM_PROMPT = `\
Você é um assistente de CRM para equipes de vendas brasileiras.
Analise os dados do contato e gere um resumo executivo completo.
Responda APENAS com JSON válido:
{
  "summary": "resumo executivo em 2-4 frases",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3"],
  "nextSteps": ["ação 1", "ação 2"],
  "sentiment": "positive" | "neutral" | "negative"
}
Regras:
- "summary": contexto comercial completo, histórico relevante
- "keyPoints": até 5 insights: intenção, urgência, estágio, produtos de interesse, riscos
- "nextSteps": 2-3 ações concretas e priorizadas para o vendedor
- "sentiment": tom geral das interações do contato
Responda APENAS com o JSON.`;

// GET /api/contacts/[id]/summary
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "contacts")) return forbidden();

  const { id: contactId } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId: session.tenantId },
    include: {
      tags: {
        select: { tag: { select: { name: true } } },
      },
      opportunities: {
        where:  { status: "open" },
        select: { title: true, value: true, stage: { select: { name: true } } },
        take:   5,
      },
      tasks: {
        where:   { status: "pending" },
        select:  { title: true, dueAt: true, priority: true },
        orderBy: { dueAt: "asc" },
        take:    5,
      },
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take:    1,
        select: {
          messages: {
            orderBy: { sentAt: "desc" },
            take:    20,
            select:  { content: true, direction: true },
          },
        },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
  }

  const messages = contact.conversations[0]?.messages.slice().reverse() ?? [];
  const tags     = contact.tags.map((t) => t.tag.name);

  const userPrompt = `Contato: ${contact.name}
Status: ${contact.status} | Score: ${contact.leadScore}/100
Tags: ${tags.join(", ") || "nenhuma"}
Oportunidades abertas: ${
    contact.opportunities.length > 0
      ? contact.opportunities
          .map((o) => `${o.title} (R$${o.value?.toString() ?? "0"}, etapa: ${o.stage.name})`)
          .join("; ")
      : "nenhuma"
  }
Tarefas pendentes: ${
    contact.tasks.length > 0
      ? contact.tasks.map((t) => `${t.title} (${t.priority})`).join("; ")
      : "nenhuma"
  }
Últimas mensagens: ${
    messages.length > 0
      ? messages
          .map((m) => `[${m.direction === "inbound" ? "contato" : "atendente"}] ${m.content}`)
          .join("\n")
      : "sem mensagens"
  }`;

  let summary:      string;
  let keyPoints:    string[];
  let nextSteps:    string[];
  let sentiment:    "positive" | "neutral" | "negative";
  let modelProvider = "mock";
  let modelId       = "mock-v2";
  let outputTokens  = 0;

  try {
    const result = await aiComplete({
      system:    SYSTEM_PROMPT,
      user:      userPrompt,
      maxTokens: 500,
      tier:      "quality",
    });
    const parsed = parseAIJson<{
      summary: string; keyPoints: string[]; nextSteps: string[]; sentiment: string;
    }>(result.text);
    summary       = String(parsed.summary);
    keyPoints     = Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String).slice(0, 5) : [];
    nextSteps     = Array.isArray(parsed.nextSteps)  ? parsed.nextSteps.map(String).slice(0, 3)  : [];
    const VALID   = ["positive", "neutral", "negative"] as const;
    sentiment     = VALID.includes(parsed.sentiment as typeof VALID[number])
      ? (parsed.sentiment as typeof VALID[number])
      : "neutral";
    modelProvider = result.provider;
    modelId       = result.modelId;
    outputTokens  = result.outputTokens;
  } catch {
    summary   = `${contact.name} é um ${contact.status} com score ${contact.leadScore}/100. ${contact.opportunities.length} oportunidade(s) em aberto.`;
    keyPoints = tags.length > 0 ? [`Tags: ${tags.join(", ")}`] : ["Sem dados suficientes para análise"];
    nextSteps = ["Verificar histórico de conversas", "Atualizar dados do contato"];
    sentiment = "neutral";
  }

  await prisma.aiLog.create({
    data: {
      tenantId:         session.tenantId,
      userId:           session.id,
      entityType:       "contact",
      entityId:         contactId,
      action:           "contact_summary",
      modelProvider,
      modelId,
      promptTokens:     messages.length * 15,
      completionTokens: outputTokens,
      inputSummary:     `contact=${contact.name}, msgs=${messages.length}, opps=${contact.opportunities.length}`,
      outputSummary:    `sentiment=${sentiment}, keyPoints=${keyPoints.length}`,
    },
  });

  return NextResponse.json({
    data: {
      summary,
      keyPoints,
      nextSteps,
      sentiment,
      contact: { name: contact.name, leadScore: contact.leadScore },
    },
  });
}
