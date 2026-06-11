/**
 * Reprocessa com a IA real todas as conversas (com mensagens) do tenant Uala Car,
 * rodando summarizeConversation + classifyLead novamente e gravando os resultados.
 *
 * Reusa as actions reais de lib/ai/actions/* — mesma lógica de persistência e ai_logs.
 *
 * Uso:  npx tsx scripts/reprocess-ai-uala-car.ts [--slug=uala-car] [--delay=4500]
 *
 * Espaça as chamadas de IA (default 4.5s) para respeitar o rate limit do free tier
 * do Gemini. Cada conversa = 2 chamadas (resumo + classificação).
 */

import { config } from "dotenv";
// Next.js carrega .env.local; tsx não — carregamos manualmente.
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { prisma } from "@/lib/db/client";
import { summarizeConversation } from "@/lib/ai/actions/summarize-conversation";
import { classifyLead } from "@/lib/ai/actions/classify-lead";

// ── args ──────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const SLUG  = (args.slug as string) ?? "uala-car";
const DELAY = Number(args.delay ?? 4500);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function lastProvider(entityId: string, action: string): Promise<string> {
  const log = await prisma.aiLog.findFirst({
    where:   { entityId, action },
    orderBy: { createdAt: "desc" },
    select:  { modelProvider: true, modelId: true, outputSummary: true },
  });
  if (!log) return "?";
  const fellBack = /fallback/i.test(log.outputSummary ?? "");
  return `${log.modelProvider}/${log.modelId}${fellBack ? " (FALLBACK)" : ""}`;
}

async function main() {
  console.log(`\nReprocessamento de IA — tenant slug="${SLUG}", delay=${DELAY}ms\n${"─".repeat(70)}`);
  console.log(`AI_PROVIDER=${process.env.AI_PROVIDER} | hasGoogleKey=${!!process.env.GOOGLE_AI_API_KEY}\n`);

  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG }, select: { id: true, name: true } });
  if (!tenant) throw new Error(`Tenant com slug "${SLUG}" não encontrado.`);
  console.log(`Tenant: ${tenant.name} (${tenant.id})\n`);

  const conversations = await prisma.conversation.findMany({
    where:   { tenantId: tenant.id },
    orderBy: { lastMessageAt: "asc" },
    select: {
      id:      true,
      contact: { select: { id: true, name: true, email: true, phone: true, companyId: true } },
    },
  });

  const runStart = new Date();
  let processed = 0;
  let skippedEmpty = 0;
  const rows: { name: string; msgs: number; intent: string; lead: number; prio: number; opp: boolean; sumProv: string; clsProv: string }[] = [];

  for (const conv of conversations) {
    const messages = await prisma.message.findMany({
      where:   { conversationId: conv.id, tenantId: tenant.id },
      orderBy: { sentAt: "asc" },
      select:  { direction: true, content: true },
    });

    if (messages.length === 0) { skippedEmpty++; continue; }

    const recentMessages = messages.slice(-15).map((m) => ({ direction: m.direction, content: m.content }));
    const lastInbound    = [...messages].reverse().find((m) => m.direction === "inbound");
    const lastMessage    = (lastInbound ?? messages[messages.length - 1]).content;

    // 1) Resumo
    await summarizeConversation({ conversationId: conv.id, tenantId: tenant.id });
    await sleep(DELAY);

    // 2) Classificação estratégica
    const cls = await classifyLead({
      contactId:      conv.contact.id,
      tenantId:       tenant.id,
      name:           conv.contact.name,
      email:          conv.contact.email,
      phone:          conv.contact.phone,
      companyId:      conv.contact.companyId,
      conversationId: conv.id,
      lastMessage,
      recentMessages,
    });
    await sleep(DELAY);

    const sumProv = await lastProvider(conv.id, "summarize_conversation");
    const clsProv = await lastProvider(conv.id, "classify_lead");

    processed++;
    rows.push({
      name:    conv.contact.name,
      msgs:    messages.length,
      intent:  cls.intent,
      lead:    cls.leadScore,
      prio:    cls.priorityScore,
      opp:     cls.createOpportunity,
      sumProv,
      clsProv,
    });
    console.log(
      `  [${processed}] ${conv.contact.name.padEnd(22).slice(0, 22)} ` +
      `msgs=${String(messages.length).padStart(2)} ` +
      `intent=${cls.intent.padEnd(13)} lead=${String(cls.leadScore).padStart(3)} prio=${String(cls.priorityScore).padStart(3)} ` +
      `opp=${cls.opp ? "S" : "N"}  [sum:${sumProv} | cls:${clsProv}]`,
    );
  }

  // ── Resumo do run via ai_logs ─────────────────────────────────────────────────
  const runLogs = await prisma.aiLog.groupBy({
    by:     ["action", "modelProvider"],
    where:  { tenantId: tenant.id, createdAt: { gte: runStart }, action: { in: ["summarize_conversation", "classify_lead"] } },
    _count: { _all: true },
  });

  console.log(`\n${"─".repeat(70)}\nRESUMO`);
  console.log(`  Conversas processadas: ${processed}  |  vazias ignoradas: ${skippedEmpty}`);
  console.log(`  Provider por ação (logs deste run):`);
  for (const l of runLogs) {
    console.log(`    ${l.action.padEnd(24)} ${l.modelProvider.padEnd(12)} ${l._count._all}`);
  }

  const realCls = rows.filter((r) => !r.clsProv.includes("mock") && !r.clsProv.includes("FALLBACK")).length;
  console.log(`\n  Classificações com IA real (Gemini): ${realCls}/${rows.length}`);
  console.log(`  Oportunidades sugeridas (createOpportunity): ${rows.filter((r) => r.opp).length}`);
  console.log(`  Lead score: min=${Math.min(...rows.map((r) => r.lead))} max=${Math.max(...rows.map((r) => r.lead))}\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("\nERRO:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
