/**
 * setup-tenant.ts
 *
 * Provisiona um tenant recém-criado com:
 *   - Pipeline padrão + 5 etapas
 *   - Tags padrão (lead quente, retorno urgente, VIP, inadimplente, interessado)
 *   - Automações padrão ativas (classificar lead, follow-up por inatividade)
 *
 * Chamado logo após a criação do tenant em /api/auth/register.
 * É idempotente: usa upsert / findFirst-guard para não duplicar dados.
 */

import { prisma } from "@/lib/db/client";

// ─── Tags padrão ─────────────────────────────────────────────────────────────

const DEFAULT_TAGS = [
  { name: "lead quente",      color: "#ef4444" },
  { name: "retorno urgente",  color: "#f97316" },
  { name: "VIP",              color: "#8b5cf6" },
  { name: "inadimplente",     color: "#dc2626" },
  { name: "interessado",      color: "#22c55e" },
];

// ─── Pipeline padrão ─────────────────────────────────────────────────────────

const DEFAULT_STAGES = [
  { name: "Novo Lead",         order: 1, probability: 10 },
  { name: "Contato Feito",     order: 2, probability: 25 },
  { name: "Proposta Enviada",  order: 3, probability: 50 },
  { name: "Negociação",        order: 4, probability: 75 },
  { name: "Fechamento",        order: 5, probability: 90 },
];

// ─── Automações padrão ───────────────────────────────────────────────────────

function buildDefaultAutomations() {
  return [
    {
      name: "Classificar lead ao criar contato",
      description: "A IA classifica automaticamente todo contato novo com lead score e tags.",
      trigger:    { type: "contact_created" },
      conditions: [],
      actions:    [{ type: "create_activity", activityType: "note", title: "Contato classificado pela IA" }],
    },
    {
      name: "Criar tarefa de retorno após inatividade",
      description: "Cria uma tarefa de follow-up quando uma conversa fica sem resposta.",
      trigger:    { type: "conversation_created" },
      conditions: [],
      actions:    [{ type: "create_task", title: "Follow-up: verificar interesse", priority: "medium", dueDays: 3 }],
    },
    {
      name: "Notificar ao criar oportunidade",
      description: "Registra atividade quando uma nova oportunidade é aberta.",
      trigger:    { type: "opportunity_created" },
      conditions: [],
      actions:    [{ type: "create_activity", activityType: "note", title: "Oportunidade aberta" }],
    },
  ] as const;
}

// ─── Função principal ─────────────────────────────────────────────────────────

export async function setupNewTenant(tenantId: string): Promise<void> {
  // Run all setup steps in parallel for speed
  await Promise.all([
    seedTags(tenantId),
    seedPipelineAndAutomations(tenantId),
  ]);
}

async function seedTags(tenantId: string): Promise<void> {
  for (const tag of DEFAULT_TAGS) {
    await prisma.tag.upsert({
      where:  { tenantId_name: { tenantId, name: tag.name } },
      update: {},
      create: { tenantId, name: tag.name, color: tag.color },
    });
  }
}

async function seedPipelineAndAutomations(tenantId: string): Promise<void> {
  // ── Pipeline ────────────────────────────────────────────────────────────────
  const existing = await prisma.pipeline.findFirst({
    where: { tenantId, isDefault: true },
    select: { id: true },
  });

  if (!existing) {
    await prisma.pipeline.create({
      data: {
        tenantId,
        name:      "Pipeline Principal",
        isDefault: true,
        stages: {
          create: DEFAULT_STAGES.map((s) => ({
            tenantId,
            name:        s.name,
            order:       s.order,
            probability: s.probability,
          })),
        },
      },
    });
  }

  // ── Automações padrão ───────────────────────────────────────────────────────
  const existingAutomationCount = await prisma.automation.count({
    where: { tenantId },
  });

  if (existingAutomationCount === 0) {
    const automations = buildDefaultAutomations();
    for (const auto of automations) {
      await prisma.automation.create({
        data: {
          tenantId,
          name:        auto.name,
          description: auto.description,
          isActive:    true,
          trigger:     auto.trigger,
          conditions:  auto.conditions,
          actions:     auto.actions,
        },
      });
    }
  }
}
