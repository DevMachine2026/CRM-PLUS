import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";

export interface FollowUpResult {
  contactId:    string;
  contactName:  string;
  message:      string;
  taskTitle:    string;
  priority:     "medium" | "high";
  inactiveDays: number;
  taskId:       string;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
Você é um assistente de vendas especializado em reengajamento de leads brasileiros.
Crie uma mensagem de follow-up personalizada e natural para retomar o contato com o lead.
Responda APENAS com JSON válido:
{
  "message": "mensagem de follow-up em português (máx 3 frases, tom amigável e não invasivo)",
  "taskTitle": "título curto da tarefa (máx 60 chars)",
  "priority": "medium" | "high"
}
Regras:
- Não mencione que é um sistema automático
- Use o nome do contato naturalmente
- Referencie o último assunto da conversa se disponível
- "high" apenas se inatividade > 7 dias
- Responda APENAS com o JSON.`;

function buildPrompt(
  contactName:  string,
  lastMessages: string[],
  inactiveDays: number
): string {
  const context = lastMessages.length > 0
    ? `Últimas mensagens:\n${lastMessages.slice(-3).join("\n")}`
    : "Sem histórico de mensagens.";
  return `Contato: ${contactName}
Dias sem resposta: ${inactiveDays}
${context}
Crie um follow-up personalizado.`;
}

function mockFollowUp(contactName: string, inactiveDays: number): {
  message: string; taskTitle: string; priority: "medium" | "high"
} {
  const firstName = contactName.split(" ")[0];
  return {
    message:   `Olá ${firstName}! Tudo bem? Passando para ver se você teve a chance de analisar nossa conversa anterior. Estou à disposição para tirar qualquer dúvida!`,
    taskTitle: `Follow-up: ${contactName}`,
    priority:  inactiveDays > 7 ? "high" : "medium",
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function generateFollowUps(
  tenantId:         string,
  inactiveThreshold = 3
): Promise<FollowUpResult[]> {
  const cutoff = new Date(Date.now() - inactiveThreshold * 86400000);

  const conversations = await prisma.conversation.findMany({
    where: {
      tenantId,
      status:        "open",
      lastMessageAt: { lt: cutoff },
      contact: {
        tasks: {
          none: { status: "pending", source: "ai" },
        },
      },
    },
    include: {
      contact: { select: { id: true, name: true } },
      messages: {
        orderBy: { sentAt: "desc" },
        take: 3,
        select: { content: true, direction: true },
      },
    },
    take: 20,
  });

  const results: FollowUpResult[] = [];

  for (const conv of conversations) {
    if (!conv.contact) continue;
    const inactiveDays = Math.floor(
      (Date.now() - (conv.lastMessageAt?.getTime() ?? Date.now())) / 86400000
    );
    const lastMessages = conv.messages
      .slice()
      .reverse()
      .map((m) => `[${m.direction === "inbound" ? "contato" : "atendente"}] ${m.content}`);

    let message:       string;
    let taskTitle:     string;
    let priority:      "medium" | "high";
    let modelProvider  = "mock";
    let modelId        = "mock-v2";
    let outputTokens   = 0;

    try {
      const aiResult = await aiComplete({
        system:    SYSTEM_PROMPT,
        user:      buildPrompt(conv.contact.name, lastMessages, inactiveDays),
        maxTokens: 200,
        tier:      "quality",
      });
      const parsed = parseAIJson<{
        message: string; taskTitle: string; priority: string;
      }>(aiResult.text);
      message        = String(parsed.message).slice(0, 500);
      taskTitle      = String(parsed.taskTitle).slice(0, 60);
      priority       = parsed.priority === "high" ? "high" : "medium";
      modelProvider  = aiResult.provider;
      modelId        = aiResult.modelId;
      outputTokens   = aiResult.outputTokens;
    } catch {
      const mock = mockFollowUp(conv.contact.name, inactiveDays);
      message   = mock.message;
      taskTitle = mock.taskTitle;
      priority  = mock.priority;
    }

    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (priority === "high" ? 4 : 24));

    const task = await prisma.task.create({
      data: {
        tenantId,
        contactId:      conv.contact.id,
        assignedUserId: conv.assignedUserId,
        title:          taskTitle,
        description:    message,
        dueAt,
        status:         "pending",
        priority,
        source:         "ai",
      },
    });

    if (inactiveDays > 7) {
      const tag = await prisma.tag.findFirst({
        where: { tenantId, name: "retorno urgente" },
      });
      if (tag) {
        await prisma.contactTag.upsert({
          where:  { contactId_tagId: { contactId: conv.contact.id, tagId: tag.id } },
          update: {},
          create: { contactId: conv.contact.id, tagId: tag.id },
        });
      }
    }

    await prisma.aiLog.create({
      data: {
        tenantId,
        entityType:       "conversation",
        entityId:         conv.id,
        action:           "generate_follow_up",
        modelProvider,
        modelId,
        promptTokens:     50,
        completionTokens: outputTokens,
        inputSummary:     `contact=${conv.contact.name}, inactiveDays=${inactiveDays}`,
        outputSummary:    `priority=${priority}, taskId=${task.id}`,
      },
    });

    results.push({
      contactId:   conv.contact.id,
      contactName: conv.contact.name,
      message,
      taskTitle,
      priority,
      inactiveDays,
      taskId: task.id,
    });
  }

  return results;
}
