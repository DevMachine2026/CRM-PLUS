import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding banco local...");

  // ── Tenant principal ──────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "acme" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "ACME Vendas Ltda",
      slug: "acme",
      plan: "pro",
      status: "active",
    },
  });

  // ── Usuário admin ─────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("senha123", 10);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@acme.com.br" } },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      tenantId: tenant.id,
      name: "Carlos Silva",
      email: "admin@acme.com.br",
      passwordHash: hash,
      role: "owner",
    },
  });

  const vendedor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "joana@acme.com.br" } },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000011",
      tenantId: tenant.id,
      name: "Joana Mendes",
      email: "joana@acme.com.br",
      passwordHash: hash,
      role: "salesperson",
    },
  });

  // ── Tags ──────────────────────────────────────────────────────────────────
  await prisma.tag.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "lead quente" } },
    update: {},
    create: { tenantId: tenant.id, name: "lead quente", color: "#ef4444" },
  });
  await prisma.tag.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "retorno urgente" } },
    update: {},
    create: { tenantId: tenant.id, name: "retorno urgente", color: "#f97316" },
  });

  // ── Pipeline ──────────────────────────────────────────────────────────────
  const pipeline = await prisma.pipeline.upsert({
    where: { id: "00000000-0000-0000-0000-000000000020" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000020",
      tenantId: tenant.id,
      name: "Vendas",
      isDefault: true,
    },
  });

  const stageNovo = await prisma.pipelineStage.upsert({
    where: { id: "00000000-0000-0000-0000-000000000021" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000021",
      pipelineId: pipeline.id,
      tenantId: tenant.id,
      name: "Novo Lead",
      order: 1,
      probability: 10,
    },
  });

  const stageContato = await prisma.pipelineStage.upsert({
    where: { id: "00000000-0000-0000-0000-000000000022" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000022",
      pipelineId: pipeline.id,
      tenantId: tenant.id,
      name: "Contato Feito",
      order: 2,
      probability: 30,
    },
  });

  // ── Contatos ──────────────────────────────────────────────────────────────
  // Contact has no unique constraint on (tenantId, email) — use externalId for upsert
  const contatosData = [
    { name: "Ana Beatriz Costa",   email: "ana@techsol.com.br" as string | null,   phone: "11999990001" as string | null, status: "lead"     as const, externalId: "seed-001" },
    { name: "Bruno Fernandes",      email: "bruno@gmail.com",                        phone: "21999990002",                  status: "lead"     as const, externalId: "seed-002" },
    { name: "Carla Nascimento",     email: "carla@empresa.com",                      phone: "31999990003",                  status: "customer" as const, externalId: "seed-003" },
    { name: "Diego Martins",        email: "diego@outlook.com",                      phone: "41999990004",                  status: "lead"     as const, externalId: "seed-004" },
    { name: "Elaine Rodrigues",     email: null,                                     phone: "51999990005",                  status: "lead"     as const, externalId: "seed-005" },
    { name: "Fernando Lima",        email: "fernando@fintech.io",                    phone: "11999990006",                  status: "lead"     as const, externalId: "seed-006" },
    { name: "Gabriela Santos",      email: "gabi@hotmail.com",                       phone: null,                           status: "inactive" as const, externalId: "seed-007" },
    { name: "Henrique Oliveira",    email: "henrique@startup.com",                   phone: "21999990008",                  status: "lead"     as const, externalId: "seed-008" },
    { name: "Isabela Prado",        email: "isabela@yahoo.com.br",                   phone: "31999990009",                  status: "lead"     as const, externalId: "seed-009" },
    { name: "João Pedro Alves",     email: "joao@construtora.eng",                   phone: "41999990010",                  status: "customer" as const, externalId: "seed-010" },
  ];

  const contactIds: string[] = [];
  for (const c of contatosData) {
    // Contact has no unique constraint besides id — find by externalId index or create
    let contact = await prisma.contact.findFirst({
      where: { tenantId: tenant.id, externalId: c.externalId },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          status: c.status,
          externalId: c.externalId,
        },
      });
    }
    contactIds.push(contact.id);
  }

  // ── Oportunidades ─────────────────────────────────────────────────────────
  await prisma.opportunity.upsert({
    where: { id: "00000000-0000-0000-0000-000000000030" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000030",
      tenantId: tenant.id,
      pipelineId: pipeline.id,
      stageId: stageContato.id,
      contactId: contactIds[0],
      assignedUserId: vendedor.id,
      title: "Plano Pro — TechSol",
      value: 4800,
      status: "open",
    },
  });

  await prisma.opportunity.upsert({
    where: { id: "00000000-0000-0000-0000-000000000031" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000031",
      tenantId: tenant.id,
      pipelineId: pipeline.id,
      stageId: stageNovo.id,
      contactId: contactIds[3],
      assignedUserId: admin.id,
      title: "Consultoria — Diego Martins",
      value: 2500,
      status: "open",
    },
  });

  // ── Conversa + mensagens para Ana ─────────────────────────────────────────
  const conv = await prisma.conversation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000040" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000040",
      tenantId: tenant.id,
      contactId: contactIds[0],
      assignedUserId: vendedor.id,
      channel: "whatsapp",
      status: "open",
    },
  });

  // Messages don't have a user-facing unique constraint beyond id — use findFirst guard for idempotency
  const existingMsgCount = await prisma.message.count({
    where: { conversationId: conv.id },
  });

  if (existingMsgCount === 0) {
    const msgs = [
      { direction: "inbound"  as const, senderType: "contact" as const, senderId: null,        content: "Oi! Vi que vocês têm um plano pro empresas. Qual o preço?" },
      { direction: "outbound" as const, senderType: "user"    as const, senderId: vendedor.id,  content: "Olá Ana! Nosso Plano Pro custa R$4.800/ano com suporte dedicado. Posso te enviar a proposta?" },
      { direction: "inbound"  as const, senderType: "contact" as const, senderId: null,        content: "Sim! Manda sim. Preciso fechar logo pois temos reunião na sexta." },
      { direction: "outbound" as const, senderType: "user"    as const, senderId: vendedor.id,  content: "Perfeito! Enviando agora. Alguma dúvida, estou à disposição." },
      { direction: "inbound"  as const, senderType: "contact" as const, senderId: null,        content: "Recebi! Vou analisar e te retorno até amanhã." },
    ];

    for (const m of msgs) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          tenantId: tenant.id,
          senderType: m.senderType,
          senderId: m.senderId,
          direction: m.direction,
          content: m.content,
        },
      });
    }
  }

  // Conversa parada há muito tempo (para testar follow-up)
  const convParada = await prisma.conversation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000041" },
    update: { lastMessageAt: new Date(Date.now() - 5 * 86400000) },
    create: {
      id: "00000000-0000-0000-0000-000000000041",
      tenantId: tenant.id,
      contactId: contactIds[1],
      assignedUserId: vendedor.id,
      channel: "whatsapp",
      status: "open",
      lastMessageAt: new Date(Date.now() - 5 * 86400000),
    },
  });

  const existingParadaMsgCount = await prisma.message.count({
    where: { conversationId: convParada.id },
  });

  if (existingParadaMsgCount === 0) {
    await prisma.message.create({
      data: {
        conversationId: convParada.id,
        tenantId: tenant.id,
        senderType: "contact",
        direction: "inbound",
        content: "Boa tarde! Tenho interesse no serviço de vocês.",
        sentAt: new Date(Date.now() - 5 * 86400000),
      },
    });
  }

  console.log("Seed concluido!");
  console.log(`   Tenant:   ${tenant.name} (${tenant.slug})`);
  console.log(`   Admin:    admin@acme.com.br / senha123`);
  console.log(`   Vendedor: joana@acme.com.br / senha123`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
