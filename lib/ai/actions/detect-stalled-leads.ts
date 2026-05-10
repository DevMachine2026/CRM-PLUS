import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";

export interface StalledLead {
  type:              "contact" | "opportunity";
  id:                string;
  name:              string;
  classification?:   string;
  stalledDays:       number;
  reason:            string;
  recommendedAction: string;
  urgency:           "low" | "medium" | "high";
  taskCreated:       boolean;
  taskId:            string | null;
}

// ── AI reasoning for stalled leads ────────────────────────────────────────────

const STALLED_SYSTEM = `\
Você analisa leads parados em um CRM de vendas brasileiro.
Para cada lead, gere uma ação recomendada objetiva e prática.
Responda APENAS com JSON:
{
  "recommendedAction": "ação específica em 1 frase",
  "urgency": "low" | "medium" | "high"
}
Regras:
- "high": parado > 14 dias ou valor alto
- "medium": parado 7-14 dias
- "low": parado < 7 dias
Responda APENAS com o JSON.`;

async function aiAnalyzeStalled(
  name: string,
  stalledDays: number,
  context: string
): Promise<{ recommendedAction: string; urgency: "low" | "medium" | "high" }> {
  try {
    const result = await aiComplete({
      system:    STALLED_SYSTEM,
      user:      `Lead: ${name}\nParado há: ${stalledDays} dias\nContexto: ${context}`,
      maxTokens: 100,
      tier:      "fast",
    });
    const parsed = parseAIJson<{ recommendedAction: string; urgency: string }>(result.text);
    const VALID = ["low", "medium", "high"] as const;
    return {
      recommendedAction: String(parsed.recommendedAction).slice(0, 150),
      urgency: VALID.includes(parsed.urgency as (typeof VALID)[number])
        ? (parsed.urgency as "low" | "medium" | "high")
        : stalledDays >= 14 ? "high" : stalledDays >= 7 ? "medium" : "low",
    };
  } catch {
    return {
      recommendedAction: `Entrar em contato com ${name} para verificar interesse`,
      urgency: stalledDays >= 14 ? "high" : stalledDays >= 7 ? "medium" : "low",
    };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function detectStalledLeads(
  tenantId: string,
  userId?:  string
): Promise<StalledLead[]> {
  const now    = new Date();
  const stalled: StalledLead[] = [];

  // 1. Lead contacts without any opportunity and not contacted in 3+ days
  const hotContacts = await prisma.contact.findMany({
    where: {
      tenantId,
      status:        "lead",
      opportunities: { none: {} },
    },
    select: { id: true, name: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
    take: 30,
  });

  for (const c of hotContacts) {
    const stalledDays = Math.floor(
      (now.getTime() - c.updatedAt.getTime()) / 86400000
    );
    if (stalledDays < 3) continue;

    const existing = await prisma.task.findFirst({
      where: { tenantId, contactId: c.id, status: "pending", source: "ai" },
    });

    const { recommendedAction, urgency } = await aiAnalyzeStalled(
      c.name,
      stalledDays,
      "Contato sem oportunidade gerada"
    );

    let taskId:     string | null = null;
    let taskCreated = false;

    if (!existing) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 1);
      const task = await prisma.task.create({
        data: {
          tenantId,
          contactId: c.id,
          title:       `Lead sem contato — ${c.name}`,
          description: recommendedAction,
          dueAt,
          status:   "pending",
          priority: stalledDays >= 7 ? "high" : "medium",
          source:   "ai",
        },
      });
      taskId      = task.id;
      taskCreated = true;
    } else {
      taskId = existing.id;
    }

    stalled.push({
      type:              "contact",
      id:                c.id,
      name:              c.name,
      stalledDays,
      reason:            `Lead sem oportunidade há ${stalledDays} dias`,
      recommendedAction,
      urgency,
      taskCreated,
      taskId,
    });
  }

  // 2. Open opportunities that haven't moved stages in 7+ days
  const openOpps = await prisma.opportunity.findMany({
    where: { tenantId, status: "open" },
    select: {
      id:        true,
      title:     true,
      value:     true,
      updatedAt: true,
      stage:     { select: { name: true } },
      contact:   { select: { id: true } },
    },
    orderBy: { updatedAt: "asc" },
    take: 30,
  });

  for (const opp of openOpps) {
    const stalledDays = Math.floor(
      (now.getTime() - opp.updatedAt.getTime()) / 86400000
    );
    if (stalledDays < 7) continue;

    const existing = await prisma.task.findFirst({
      where: { tenantId, opportunityId: opp.id, status: "pending", source: "ai" },
    });

    const { recommendedAction, urgency } = await aiAnalyzeStalled(
      opp.title,
      stalledDays,
      `Oportunidade na etapa "${opp.stage.name}", valor R$${opp.value?.toString() ?? "0"}`
    );

    let taskId:     string | null = null;
    let taskCreated = false;

    if (!existing) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 1);
      const task = await prisma.task.create({
        data: {
          tenantId,
          opportunityId: opp.id,
          contactId:     opp.contact?.id ?? null,
          title:         `Gargalo: ${opp.title}`,
          description:   recommendedAction,
          dueAt,
          status:   "pending",
          priority: stalledDays >= 14 ? "high" : "medium",
          source:   "ai",
        },
      });
      taskId      = task.id;
      taskCreated = true;
    } else {
      taskId = existing.id;
    }

    stalled.push({
      type:              "opportunity",
      id:                opp.id,
      name:              opp.title,
      stalledDays,
      reason:            `Oportunidade na etapa "${opp.stage.name}" sem movimentação há ${stalledDays} dias`,
      recommendedAction,
      urgency,
      taskCreated,
      taskId,
    });
  }

  // Log the detection run
  await prisma.aiLog.create({
    data: {
      tenantId,
      userId:           userId ?? null,
      entityType:       null,
      entityId:         null,
      action:           "detect_stalled_leads",
      modelProvider:    "mixed",
      modelId:          "mixed",
      promptTokens:     stalled.length * 20,
      completionTokens: stalled.length * 15,
      inputSummary:     `contacts=${hotContacts.length}, opps=${openOpps.length}`,
      outputSummary:    `stalled=${stalled.length}, tasksCreated=${stalled.filter((s) => s.taskCreated).length}`,
    },
  });

  return stalled;
}
