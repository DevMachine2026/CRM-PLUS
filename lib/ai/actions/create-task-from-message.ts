import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";

export interface CreateTaskFromMessageInput {
  conversationId: string;
  tenantId:       string;
  userId?:        string;
  contactId?:     string;
  messageLimit?:  number;
}

export interface ExtractedTask {
  title:       string;
  description: string;
  priority:    "low" | "medium" | "high";
  dueDays:     number | null;
}

export interface CreateTaskFromMessageResult {
  extractedTasks: ExtractedTask[];
  createdTaskIds: string[];
  nothingFound:   boolean;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
Você é um assistente de vendas que extrai compromissos e tarefas de conversas em português.
Analise as mensagens e identifique APENAS compromissos concretos: reuniões marcadas, prazos prometidos, entregas combinadas, retornos acordados.
Responda APENAS com JSON válido no formato:
{
  "tasks": [
    {
      "title": "título conciso da tarefa (máx 100 caracteres)",
      "description": "contexto relevante (máx 200 caracteres)",
      "priority": "low" | "medium" | "high",
      "dueDays": <inteiro: dias a partir de hoje, ou null se não houver prazo>
    }
  ]
}
Regras:
- Extraia APENAS compromissos explícitos — não invente tarefas
- Prioridade "high" para reuniões/prazos em até 2 dias; "medium" para esta semana; "low" para mais de 7 dias
- Se não houver compromissos concretos, retorne {"tasks": []}
- Máximo de 5 tarefas por conversa
Responda APENAS com o JSON, sem markdown.`;

function buildPrompt(messages: { direction: string; content: string; sentAt: Date }[]): string {
  const lines = messages.map((m) => {
    const who = m.direction === "inbound" ? "[cliente]" : "[atendente]";
    return `${who} ${m.content}`;
  });
  return `Conversa (${messages.length} mensagens):\n${lines.join("\n")}\n\nIdentifique os compromissos e tarefas combinados.`;
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

const COMMITMENT_PATTERNS: {
  pattern: RegExp;
  title: string;
  priority: "low" | "medium" | "high";
  dueDays: number | null;
}[] = [
  { pattern: /reunião|reuniao|meet|call amanhã|call amanha/i,      title: "Realizar reunião agendada",         priority: "high",   dueDays: 1 },
  { pattern: /enviar proposta|mando o orçamento|mando a proposta/i, title: "Enviar proposta/orçamento",         priority: "high",   dueDays: 1 },
  { pattern: /retorno (em|até|ate) \d+ dias|volto em \d+ dias/i,   title: "Fazer retorno combinado",           priority: "medium", dueDays: 3 },
  { pattern: /prazo|entrega|deadline/i,                             title: "Verificar prazo de entrega",        priority: "medium", dueDays: 3 },
  { pattern: /segunda|terça|quarta|quinta|sexta/i,                  title: "Contato combinado na data acordada",priority: "medium", dueDays: 4 },
  { pattern: /demo|demonstração|apresentação|apresentacao/i,        title: "Preparar demonstração",             priority: "medium", dueDays: 2 },
  { pattern: /contrato|assinar|assine|assinatura/i,                 title: "Encaminhar contrato para assinatura",priority: "high",  dueDays: 1 },
];

function mockExtract(
  messages: { direction: string; content: string }[]
): ExtractedTask[] {
  const allText = messages.map((m) => m.content).join(" ");
  const found: ExtractedTask[] = [];

  for (const { pattern, title, priority, dueDays } of COMMITMENT_PATTERNS) {
    if (pattern.test(allText)) {
      found.push({
        title,
        description: `[mock] Detectado por padrão: "${pattern.source.slice(0, 40)}"`,
        priority,
        dueDays,
      });
      if (found.length >= 3) break;
    }
  }

  return found;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function createTaskFromMessage(
  input: CreateTaskFromMessageInput
): Promise<CreateTaskFromMessageResult> {

  const limit = Math.min(input.messageLimit ?? 15, 30);

  const messages = await prisma.message.findMany({
    where:   { conversationId: input.conversationId, tenantId: input.tenantId },
    orderBy: { sentAt: "desc" },
    take:    limit,
    select:  { content: true, direction: true, sentAt: true },
  });

  if (messages.length === 0) {
    return { extractedTasks: [], createdTaskIds: [], nothingFound: true };
  }

  const chronological = [...messages].reverse();

  // ── AI inference ──────────────────────────────────────────────────────────────
  let extractedTasks: ExtractedTask[];
  let modelProvider   = "mock";
  let modelId         = "mock-v2";
  let outputTokens    = 0;

  try {
    const aiResult = await aiComplete({
      system:    SYSTEM_PROMPT,
      user:      buildPrompt(chronological),
      maxTokens: 500,
      tier:      "quality",
    });

    const parsed = parseAIJson<{ tasks: unknown[] }>(aiResult.text);
    const VALID_PRIORITIES = ["low", "medium", "high"] as const;

    extractedTasks = (Array.isArray(parsed.tasks) ? parsed.tasks : [])
      .slice(0, 5)
      .map((t) => {
        const task = t as Record<string, unknown>;
        const priority = VALID_PRIORITIES.includes(task.priority as typeof VALID_PRIORITIES[number])
          ? (task.priority as "low" | "medium" | "high")
          : "medium";
        return {
          title:       String(task.title ?? "Tarefa sem título").slice(0, 100),
          description: String(task.description ?? "").slice(0, 200),
          priority,
          dueDays:     task.dueDays != null ? Math.max(0, Math.round(Number(task.dueDays))) : null,
        };
      });

    modelProvider = aiResult.provider;
    modelId       = aiResult.modelId;
    outputTokens  = aiResult.outputTokens;
  } catch {
    extractedTasks = mockExtract(chronological);
  }

  if (extractedTasks.length === 0) {
    await prisma.aiLog.create({
      data: {
        tenantId:         input.tenantId,
        userId:           input.userId ?? null,
        entityType:       "conversation",
        entityId:         input.conversationId,
        action:           "create_task_from_message",
        modelProvider,
        modelId,
        promptTokens:     messages.length * 10,
        completionTokens: outputTokens,
        inputSummary:     `messages=${messages.length}`,
        outputSummary:    "tasks=0 (nothing found)",
      },
    });
    return { extractedTasks: [], createdTaskIds: [], nothingFound: true };
  }

  // ── Create tasks + log ────────────────────────────────────────────────────────
  const createdTaskIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const extracted of extractedTasks) {
      const dueAt = extracted.dueDays != null
        ? new Date(Date.now() + extracted.dueDays * 86_400_000)
        : null;

      const task = await tx.task.create({
        data: {
          tenantId:    input.tenantId,
          contactId:   input.contactId ?? null,
          title:       extracted.title,
          description: `${extracted.description}\n[conversa: ${input.conversationId}]`.trim(),
          priority:    extracted.priority,
          dueAt,
          status:      "pending",
          source:      "ai",
        },
      });

      createdTaskIds.push(task.id);
    }

    await tx.aiLog.create({
      data: {
        tenantId:         input.tenantId,
        userId:           input.userId ?? null,
        entityType:       "conversation",
        entityId:         input.conversationId,
        action:           "create_task_from_message",
        modelProvider,
        modelId,
        promptTokens:     messages.length * 10,
        completionTokens: outputTokens,
        inputSummary:     `messages=${messages.length}`,
        outputSummary:    `tasks_created=${createdTaskIds.length}: ${extractedTasks.map((t) => t.title).join("; ").slice(0, 200)}`,
      },
    });
  });

  return { extractedTasks, createdTaskIds, nothingFound: false };
}
