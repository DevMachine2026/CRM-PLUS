# CRM PLUS — IA Real: Gemini (dev) + Claude (prod)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir todos os mocks de IA por chamadas reais ao Claude (produção) e Google Gemini (desenvolvimento gratuito), implementando as 7 features de IA que diferenciam o CRM PLUS.

**Architecture:** A função central `aiComplete()` em `lib/ai/provider.ts` é expandida para suportar Gemini além de Claude — essa mudança única desbloqueia Gemini para todas as 4 actions que já usam `aiComplete` (`suggest-reply`, `summarize`, `detect-intent`, `classify-lead` após reescrita). Features novas (`follow-up`, alertas com AI reasoning) são adicionadas como novas actions e routes. Uma migration adiciona `leadScore` ao Contact.

**Tech Stack:** Next.js 16 App Router · Prisma 7 · `@anthropic-ai/sdk` · `@google/generative-ai` · Supabase CLI · Vercel Cron Jobs · TypeScript strict

---

## Mapa de arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Criar | `scripts/setup-dev.sh` | Automatiza Supabase CLI + seed |
| Criar | `prisma/seed.ts` | Dados realistas PT-BR |
| Criar | `.env.local.example` | Variáveis atualizadas |
| Modificar | `lib/ai/provider.ts` | Adiciona Gemini; seleciona modelo por tier |
| Modificar | `lib/ai/actions/classify-lead.ts` | Mock → AI real |
| Criar | `lib/ai/actions/follow-up.ts` | Nova action de follow-up autônomo |
| Modificar | `lib/ai/actions/detect-stalled-leads.ts` | Adiciona AI reasoning ao mock existente |
| Criar | `app/api/ai/follow-up/route.ts` | Endpoint cron de follow-up |
| Modificar | `app/api/ai/stalled/route.ts` | Adiciona POST handler para cron |
| Criar | `app/api/contacts/[id]/summary/route.ts` | Resumo 360° do contato |
| Criar | `app/(dashboard)/contacts/[id]/page.tsx` | Perfil do contato |
| Modificar | `app/(dashboard)/contacts/contacts-client.tsx` | Badge AI score |
| Modificar | `app/(dashboard)/inbox/inbox-client.tsx` | Chips suggest-reply |
| Modificar | `app/(dashboard)/dashboard/page.tsx` | Seção gargalos |
| Modificar | `vercel.json` | Crons + região |
| Criar | `prisma/migrations/20260509000000_add_lead_score/migration.sql` | Campo leadScore |

---

## Task 1 — Ambiente local (Supabase CLI + seed)

**Files:**
- Create: `scripts/setup-dev.sh`
- Create: `prisma/seed.ts`
- Create: `.env.local.example`

- [ ] **Step 1.1: Instalar dependências de dev e o SDK do Gemini**

```bash
cd /mnt/hd/CRM-PLUS
npm install @google/generative-ai
npm install --save-dev tsx
```

Esperado: `added N packages` sem erros.

- [ ] **Step 1.2: Criar `.env.local.example`**

Criar o arquivo `/mnt/hd/CRM-PLUS/.env.local.example`:

```bash
# ── Banco ─────────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# ── Auth ──────────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET="dev-secret-at-least-32-chars-long-here"
NEXTAUTH_URL="http://localhost:3000"

# ── IA (desenvolvimento — Gemini gratuito) ────────────────────────────────────
AI_PROVIDER="gemini"
GOOGLE_AI_API_KEY=""      # https://aistudio.google.com → Get API Key (gratuito)

# ── IA (produção — Claude) ────────────────────────────────────────────────────
# AI_PROVIDER="claude"
# ANTHROPIC_API_KEY=""    # https://console.anthropic.com

# ── Cron Jobs ─────────────────────────────────────────────────────────────────
CRON_SECRET="gere-com-openssl-rand-hex-32"

# ── WhatsApp/Instagram (Fase 6 — deixar vazio por agora) ─────────────────────
# WHATSAPP_PHONE_NUMBER_ID=""
# WHATSAPP_ACCESS_TOKEN=""
# WHATSAPP_WEBHOOK_VERIFY_TOKEN=""
# WHATSAPP_APP_SECRET=""
# INSTAGRAM_ACCESS_TOKEN=""
# INSTAGRAM_APP_SECRET=""
```

- [ ] **Step 1.3: Criar `scripts/setup-dev.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== CRM PLUS — Setup do ambiente local ==="

# Pré-requisitos
command -v docker >/dev/null 2>&1 || { echo "❌  Docker não encontrado. Instale em https://docker.com"; exit 1; }
command -v npx   >/dev/null 2>&1 || { echo "❌  Node.js/npm não encontrado."; exit 1; }

# Supabase CLI
if ! command -v supabase >/dev/null 2>&1; then
  echo "→ Instalando Supabase CLI..."
  npm install -g supabase
fi

# .env.local
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "→ .env.local criado. Preencha GOOGLE_AI_API_KEY antes de continuar."
  echo "  Obtenha grátis em: https://aistudio.google.com"
  echo ""
  read -p "Pressione ENTER após preencher o .env.local..."
fi

# Supabase local
if ! supabase status 2>/dev/null | grep -q "API URL"; then
  echo "→ Iniciando Supabase local (Docker)..."
  supabase start
fi

echo "→ Aplicando schema Prisma no banco local..."
npx prisma db push --skip-generate

echo "→ Rodando seed com dados de teste..."
npx tsx prisma/seed.ts

echo ""
echo "✅  Ambiente pronto!"
echo "   Banco:    postgresql://postgres:postgres@127.0.0.1:54322/postgres"
echo "   Studio:   http://localhost:54323"
echo "   App:      npm run dev → http://localhost:3000"
echo ""
echo "   Login de teste:"
echo "   Email:    admin@acme.com.br"
echo "   Senha:    senha123"
```

Tornar executável:

```bash
chmod +x scripts/setup-dev.sh
```

- [ ] **Step 1.4: Criar `prisma/seed.ts`**

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding banco local...");

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
    where: { email: "admin@acme.com.br" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      tenantId: tenant.id,
      name: "Carlos Silva",
      email: "admin@acme.com.br",
      password: hash,
      role: "owner",
    },
  });

  const vendedor = await prisma.user.upsert({
    where: { email: "joana@acme.com.br" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000011",
      tenantId: tenant.id,
      name: "Joana Mendes",
      email: "joana@acme.com.br",
      password: hash,
      role: "salesperson",
    },
  });

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tagHot = await prisma.tag.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "lead quente" } },
    update: {},
    create: { tenantId: tenant.id, name: "lead quente", color: "#ef4444" },
  });
  const tagFollowup = await prisma.tag.upsert({
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
      name: "Novo Lead",
      order: 1,
      color: "#6366f1",
    },
  });

  const stageContato = await prisma.pipelineStage.upsert({
    where: { id: "00000000-0000-0000-0000-000000000022" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000022",
      pipelineId: pipeline.id,
      name: "Contato Feito",
      order: 2,
      color: "#8b5cf6",
    },
  });

  // ── Contatos ──────────────────────────────────────────────────────────────
  const contatos = [
    { name: "Ana Beatriz Costa",   email: "ana@techsol.com.br",   phone: "11999990001", status: "lead"     as const },
    { name: "Bruno Fernandes",      email: "bruno@gmail.com",       phone: "21999990002", status: "lead"     as const },
    { name: "Carla Nascimento",     email: "carla@empresa.com",     phone: "31999990003", status: "customer" as const },
    { name: "Diego Martins",        email: "diego@outlook.com",     phone: "41999990004", status: "lead"     as const },
    { name: "Elaine Rodrigues",     email: null,                    phone: "51999990005", status: "lead"     as const },
    { name: "Fernando Lima",        email: "fernando@fintech.io",   phone: "11999990006", status: "lead"     as const },
    { name: "Gabriela Santos",      email: "gabi@hotmail.com",      phone: null,          status: "inactive" as const },
    { name: "Henrique Oliveira",    email: "henrique@startup.com",  phone: "21999990008", status: "lead"     as const },
    { name: "Isabela Prado",        email: "isabela@yahoo.com.br",  phone: "31999990009", status: "lead"     as const },
    { name: "João Pedro Alves",     email: "joao@construtora.eng",  phone: "41999990010", status: "customer" as const },
  ];

  const contactIds: string[] = [];
  for (const c of contatos) {
    const contact = await prisma.contact.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: c.email ?? `noemail_${c.name.replace(/ /g, "")}@seed.local` } },
      update: {},
      create: { tenantId: tenant.id, assignedUserId: vendedor.id, ...c },
    });
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
      probability: 65,
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
      probability: 30,
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

  const msgs = [
    { direction: "inbound"  as const, content: "Oi! Vi que vocês têm um plano pro empresas. Qual o preço?" },
    { direction: "outbound" as const, content: "Olá Ana! Nosso Plano Pro custa R$4.800/ano com suporte dedicado. Posso te enviar a proposta?" },
    { direction: "inbound"  as const, content: "Sim! Manda sim. Preciso fechar logo pois temos reunião na sexta." },
    { direction: "outbound" as const, content: "Perfeito! Enviando agora. Alguma dúvida, estou à disposição." },
    { direction: "inbound"  as const, content: "Recebi! Vou analisar e te retorno até amanhã." },
  ];

  for (const m of msgs) {
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        tenantId: tenant.id,
        senderType: m.direction === "inbound" ? "contact" : "user",
        senderId: m.direction === "outbound" ? vendedor.id : null,
        direction: m.direction,
        content: m.content,
      },
    });
  }

  // Conversa parada há muito tempo (para testar follow-up)
  const convParada = await prisma.conversation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000041" },
    update: { lastMessageAt: new Date(Date.now() - 5 * 86400000) }, // 5 dias atrás
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

  await prisma.message.upsert({
    where: { id: "00000000-0000-0000-0000-000000000050" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000050",
      conversationId: convParada.id,
      tenantId: tenant.id,
      senderType: "contact",
      direction: "inbound",
      content: "Boa tarde! Tenho interesse no serviço de vocês.",
      sentAt: new Date(Date.now() - 5 * 86400000),
    },
  });

  console.log("✅  Seed concluído!");
  console.log(`   Tenant:   ${tenant.name} (${tenant.slug})`);
  console.log(`   Admin:    admin@acme.com.br / senha123`);
  console.log(`   Vendedor: joana@acme.com.br / senha123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 1.5: Adicionar script seed ao `package.json`**

Abrir `package.json` e adicionar dentro de `"scripts"`:

```json
"db:seed": "tsx prisma/seed.ts",
"db:reset": "npx prisma db push --force-reset && tsx prisma/seed.ts"
```

- [ ] **Step 1.6: Verificar compilação TypeScript após mudanças**

```bash
npx tsc --noEmit
```

Esperado: sem output (zero erros).

- [ ] **Step 1.7: Commit**

```bash
git add scripts/setup-dev.sh prisma/seed.ts .env.local.example package.json package-lock.json
git commit -m "feat: ambiente local (setup-dev.sh, seed, env) + @google/generative-ai"
```

---

## Task 2 — Migration: campo `leadScore` no Contact

**Files:**
- Create: `prisma/migrations/20260509000000_add_lead_score/migration.sql`
- Modify: `prisma/schema.prisma`

> O Contact não tem `leadScore`. A action `classify-lead` calcula um score mas não o persiste. Esta migration adiciona o campo.

- [ ] **Step 2.1: Adicionar `leadScore` ao model Contact no schema**

Abrir `prisma/schema.prisma`. Localizar `model Contact {` e adicionar o campo após `status`:

```prisma
  leadScore  Int       @default(0) @map("lead_score")
```

O bloco final do model deve ficar:

```prisma
model Contact {
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String        @map("tenant_id") @db.Uuid
  companyId   String?       @map("company_id") @db.Uuid
  name        String
  email       String?
  phone       String?
  externalId  String?       @map("external_id")
  status      ContactStatus @default(lead)
  leadScore   Int           @default(0) @map("lead_score")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  tenant        Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  company       Company?      @relation(fields: [companyId], references: [id], onDelete: SetNull)
  tags          ContactTag[]
  opportunities Opportunity[]
  tasks         Task[]
  conversations Conversation[]

  @@index([tenantId])
  @@index([status])
  @@map("contacts")
}
```

- [ ] **Step 2.2: Criar a migration SQL manualmente**

```bash
mkdir -p prisma/migrations/20260509000000_add_lead_score
```

Criar `prisma/migrations/20260509000000_add_lead_score/migration.sql`:

```sql
-- AddColumn
ALTER TABLE "contacts" ADD COLUMN "lead_score" INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 2.3: Aplicar ao banco local**

```bash
npx prisma db push
```

Esperado: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 2.4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 2.5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: adiciona leadScore ao model Contact"
```

---

## Task 3 — Gemini + Claude em `lib/ai/provider.ts`

**Files:**
- Modify: `lib/ai/provider.ts`

> Esta é a mudança central. Adicionar Gemini aqui desbloqueia automaticamente todas as 4 actions que já usam `aiComplete`: `suggest-reply`, `summarize-conversation`, `detect-intent`, e `classify-lead` (após Task 4).

- [ ] **Step 3.1: Reescrever `lib/ai/provider.ts`**

Substituir todo o conteúdo do arquivo:

```typescript
/**
 * Central AI completion wrapper.
 *
 * Provider resolution (via AI_PROVIDER env var):
 *   "gemini"   → Google Gemini (gratuito para dev: aistudio.google.com)
 *   "claude"   → Anthropic Claude (produção)
 *   "mock"     → sempre mock (CI / sem API key)
 *   default    → tenta claude se ANTHROPIC_API_KEY existir, senão mock
 *
 * Model tiers (escolhido por cada action via options.tier):
 *   "fast"    → gemini-2.0-flash          / claude-haiku-4-5-20251001
 *   "quality" → gemini-2.5-pro-preview-05-06 / claude-sonnet-4-6
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface AICompletionOptions {
  system:    string;
  user:      string;
  maxTokens?: number;
  tier?:     "fast" | "quality"; // default: "fast"
}

export interface AICompletionResult {
  text:         string;
  inputTokens:  number;
  outputTokens: number;
  provider:     string;
  modelId:      string;
}

// ── Modelos por provider e tier ───────────────────────────────────────────────

const MODELS = {
  anthropic: {
    fast:    process.env.AI_MODEL_FAST    ?? "claude-haiku-4-5-20251001",
    quality: process.env.AI_MODEL_QUALITY ?? "claude-sonnet-4-6",
  },
  gemini: {
    fast:    "gemini-2.0-flash",
    quality: "gemini-2.5-pro-preview-05-06",
  },
} as const;

// ── Seleção de provider ───────────────────────────────────────────────────────

type ActiveProvider = "anthropic" | "gemini" | "mock";

function resolveProvider(): ActiveProvider {
  const p = (process.env.AI_PROVIDER ?? "").toLowerCase();
  if (p === "mock")                                   return "mock";
  if (p === "gemini" && process.env.GOOGLE_AI_API_KEY) return "gemini";
  if (p === "claude" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  // Auto-detect: prefere gemini se disponível, depois claude
  if (process.env.GOOGLE_AI_API_KEY)                  return "gemini";
  if (process.env.ANTHROPIC_API_KEY)                  return "anthropic";
  return "mock";
}

export function isAIEnabled(): boolean {
  return resolveProvider() !== "mock";
}

// ── Singletons ────────────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;
function anthropicClient(): Anthropic {
  _anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _anthropic;
}

let _gemini: GoogleGenerativeAI | null = null;
function geminiClient(): GoogleGenerativeAI {
  _gemini ??= new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  return _gemini;
}

// ── Completions por provider ──────────────────────────────────────────────────

async function completeWithClaude(
  options: AICompletionOptions,
  modelId: string
): Promise<AICompletionResult> {
  const response = await anthropicClient().messages.create({
    model:      modelId,
    max_tokens: options.maxTokens ?? 512,
    system:     options.system,
    messages:   [{ role: "user", content: options.user }],
  });

  const text = response.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("");

  return {
    text,
    inputTokens:  response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    provider:     "anthropic",
    modelId,
  };
}

async function completeWithGemini(
  options: AICompletionOptions,
  modelId: string
): Promise<AICompletionResult> {
  const model = geminiClient().getGenerativeModel({
    model: modelId,
    systemInstruction: options.system,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: options.user }] }],
    generationConfig: { maxOutputTokens: options.maxTokens ?? 512 },
  });

  const text       = result.response.text();
  const usage      = result.response.usageMetadata;
  const inputTok   = usage?.promptTokenCount     ?? 0;
  const outputTok  = usage?.candidatesTokenCount ?? 0;

  return {
    text,
    inputTokens:  inputTok,
    outputTokens: outputTok,
    provider:     "gemini",
    modelId,
  };
}

// ── Função principal ──────────────────────────────────────────────────────────

/**
 * Executa uma completion de IA.
 * Lança erro se AI_PROVIDER=mock ou nenhuma API key configurada.
 * Cada action deve capturar o erro e usar seu mock como fallback.
 */
export async function aiComplete(
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const provider = resolveProvider();
  const tier     = options.tier ?? "fast";

  if (provider === "mock") throw new Error("ai-disabled");

  if (provider === "anthropic") {
    return completeWithClaude(options, MODELS.anthropic[tier]);
  }

  return completeWithGemini(options, MODELS.gemini[tier]);
}

/**
 * Parse JSON de resposta da IA, removendo fences de markdown se presentes.
 * Lança SyntaxError em JSON inválido — action deve usar mock como fallback.
 */
export function parseAIJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
```

- [ ] **Step 3.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3.3: Testar que o módulo resolve sem erros de import**

```bash
node -e "require('./lib/ai/provider.ts')" 2>&1 || npx tsx -e "import('./lib/ai/provider.ts').then(() => console.log('OK'))"
```

Esperado: `OK` (ou sem erros de import).

- [ ] **Step 3.4: Commit**

```bash
git add lib/ai/provider.ts
git commit -m "feat: provider.ts suporta Gemini (dev) e Claude (prod) com seleção por tier"
```

---

## Task 4 — `classify-lead.ts` com AI real

**Files:**
- Modify: `lib/ai/actions/classify-lead.ts`

> Reescrever para usar `aiComplete` com tier "fast" (Gemini Flash / Claude Haiku). Manter mock como fallback. Persistir `leadScore` no banco após classificação.

- [ ] **Step 4.1: Reescrever `lib/ai/actions/classify-lead.ts`**

```typescript
import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";

export interface ClassifyLeadInput {
  contactId:      string;
  tenantId:       string;
  userId?:        string;
  name:           string;
  email?:         string | null;
  phone?:         string | null;
  companyId?:     string | null;
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

// ── Mock fallback (inalterado do original) ────────────────────────────────────

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

  // ── AI inference ─────────────────────────────────────────────────────────
  try {
    const aiResult = await aiComplete({
      system:    SYSTEM_PROMPT,
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

    const VALID_CLASS   = ["hot", "warm", "cold"] as const;
    const VALID_STATUS  = ["lead", "customer", "inactive"] as const;
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

  // ── Persistir leadScore no Contact ────────────────────────────────────────
  // ── Aplicar tags existentes no tenant ────────────────────────────────────
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
        where: { contactId_tagId: { contactId: input.contactId, tagId: tag.id } },
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
        inputSummary:  `name=${input.name}, email=${!!input.email}, phone=${!!input.phone}`,
        outputSummary: `score=${result.score}, class=${result.classification}, tags=${result.tags.join(",")}`,
      },
    });
  });

  return result;
}
```

- [ ] **Step 4.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4.3: Commit**

```bash
git add lib/ai/actions/classify-lead.ts
git commit -m "feat: classify-lead usa AI real (Gemini/Claude) + persiste leadScore + aplica tags"
```

---

## Task 5 — `follow-up.ts` action + route

**Files:**
- Create: `lib/ai/actions/follow-up.ts`
- Create: `app/api/ai/follow-up/route.ts`

- [ ] **Step 5.1: Criar `lib/ai/actions/follow-up.ts`**

```typescript
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

  // Conversas abertas sem resposta há X dias, sem tarefa AI pendente
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
      .reverse()
      .map((m) => `[${m.direction === "inbound" ? "contato" : "atendente"}] ${m.content}`);

    let message:   string;
    let taskTitle: string;
    let priority:  "medium" | "high";
    let modelProvider = "mock";
    let modelId       = "mock-v2";
    let outputTokens  = 0;

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

    // Criar tarefa de retorno
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (priority === "high" ? 4 : 24));

    const task = await prisma.task.create({
      data: {
        tenantId,
        contactId:    conv.contact.id,
        assignedUserId: conv.assignedUserId,
        title:        taskTitle,
        description:  message,
        dueAt,
        status:       "pending",
        priority,
        source:       "ai",
      },
    });

    // Aplicar tag "retorno urgente" se inatividade > 7 dias
    if (inactiveDays > 7) {
      const tag = await prisma.tag.findFirst({
        where: { tenantId, name: "retorno urgente" },
      });
      if (tag) {
        await prisma.contactTag.upsert({
          where: { contactId_tagId: { contactId: conv.contact.id, tagId: tag.id } },
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
```

- [ ] **Step 5.2: Criar `app/api/ai/follow-up/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateFollowUps } from "@/lib/ai/actions/follow-up";

// POST /api/ai/follow-up — chamado pelo Vercel Cron Job (hourly)
// Protegido por Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Busca todos os tenants ativos e processa cada um
    const { prisma } = await import("@/lib/db/client");
    const tenants = await prisma.tenant.findMany({
      where: { status: "active" },
      select: { id: true, slug: true },
    });

    const summary: { tenant: string; followUps: number }[] = [];

    for (const tenant of tenants) {
      const results = await generateFollowUps(tenant.id);
      summary.push({ tenant: tenant.slug, followUps: results.length });
    }

    return NextResponse.json({
      ok: true,
      processed: summary,
      total: summary.reduce((acc, s) => acc + s.followUps, 0),
    });
  } catch (err) {
    console.error("[follow-up cron]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 5.3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5.4: Commit**

```bash
git add lib/ai/actions/follow-up.ts app/api/ai/follow-up/route.ts
git commit -m "feat: follow-up autônomo — action + cron endpoint"
```

---

## Task 6 — `detect-stalled-leads.ts` com AI reasoning

**Files:**
- Modify: `lib/ai/actions/detect-stalled-leads.ts`
- Modify: `app/api/ai/stalled/route.ts`

> Adicionar AI reasoning sobre cada lead parado — justificativa + ação recomendada. Adicionar POST handler ao route para o cron.

- [ ] **Step 6.1: Modificar `lib/ai/actions/detect-stalled-leads.ts`**

Adicionar imports no topo e uma nova função `aiAnalyzeStalled` após as constantes existentes. Substituir o arquivo completo:

```typescript
import { prisma } from "@/lib/db/client";
import { aiComplete, parseAIJson } from "@/lib/ai/provider";

export interface StalledLead {
  type:              "contact" | "opportunity";
  id:                string;
  name:              string;
  stalledDays:       number;
  reason:            string;
  recommendedAction: string;   // novo: ação recomendada pela IA
  urgency:           "low" | "medium" | "high";  // novo
  taskCreated:       boolean;
  taskId:            string | null;
}

// ── AI reasoning para leads parados ──────────────────────────────────────────

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
      urgency: VALID.includes(parsed.urgency as typeof VALID[number])
        ? parsed.urgency as "low" | "medium" | "high"
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
  const now     = new Date();
  const stalled: StalledLead[] = [];

  // 1. Contatos hot sem oportunidade parados há 3+ dias
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
    const stalledDays = Math.floor((now.getTime() - c.updatedAt.getTime()) / 86400000);
    if (stalledDays < 3) continue;

    const existing = await prisma.task.findFirst({
      where: { tenantId, contactId: c.id, status: "pending", source: "ai" },
    });

    const { recommendedAction, urgency } = await aiAnalyzeStalled(
      c.name,
      stalledDays,
      "Contato sem oportunidade gerada"
    );

    let taskId:      string | null = null;
    let taskCreated  = false;

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

  // 2. Oportunidades abertas sem movimentação há 7+ dias
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
    const stalledDays = Math.floor((now.getTime() - opp.updatedAt.getTime()) / 86400000);
    if (stalledDays < 7) continue;

    const existing = await prisma.task.findFirst({
      where: { tenantId, opportunityId: opp.id, status: "pending", source: "ai" },
    });

    const { recommendedAction, urgency } = await aiAnalyzeStalled(
      opp.title,
      stalledDays,
      `Oportunidade na etapa "${opp.stage.name}", valor R$${opp.value}`
    );

    let taskId:      string | null = null;
    let taskCreated  = false;

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
      reason:            `Oportunidade em "${opp.stage.name}" sem movimentação há ${stalledDays} dias`,
      recommendedAction,
      urgency,
      taskCreated,
      taskId,
    });
  }

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
```

- [ ] **Step 6.2: Adicionar POST handler ao `app/api/ai/stalled/route.ts`**

Substituir o arquivo completo:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { detectStalledLeads } from "@/lib/ai/actions/detect-stalled-leads";
import { prisma } from "@/lib/db/client";

// GET /api/ai/stalled — uso manual pelo gestor (autenticado)
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "opportunities")) return forbidden();

  const stalled = await detectStalledLeads(session.tenantId, session.id);

  return NextResponse.json({
    data: stalled,
    meta: {
      total:        stalled.length,
      tasksCreated: stalled.filter((s) => s.taskCreated).length,
    },
  });
}

// POST /api/ai/stalled — chamado pelo Vercel Cron Job (daily 8h)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    where:  { status: "active" },
    select: { id: true, slug: true },
  });

  const summary: { tenant: string; stalled: number; tasksCreated: number }[] = [];

  for (const tenant of tenants) {
    const results = await detectStalledLeads(tenant.id);
    summary.push({
      tenant:       tenant.slug,
      stalled:      results.length,
      tasksCreated: results.filter((r) => r.taskCreated).length,
    });
  }

  return NextResponse.json({ ok: true, processed: summary });
}
```

- [ ] **Step 6.3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6.4: Commit**

```bash
git add lib/ai/actions/detect-stalled-leads.ts app/api/ai/stalled/route.ts
git commit -m "feat: stalled leads com AI reasoning + POST cron handler"
```

---

## Task 7 — Endpoint `/api/contacts/[id]/summary`

**Files:**
- Create: `app/api/contacts/[id]/summary/route.ts`

- [ ] **Step 7.1: Criar `app/api/contacts/[id]/summary/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
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
    select: {
      id:        true,
      name:      true,
      email:     true,
      phone:     true,
      status:    true,
      leadScore: true,
      tags:      { select: { tag: { select: { name: true } } } },
      opportunities: {
        where:   { status: "open" },
        select:  { title: true, value: true, stage: { select: { name: true } }, probability: true },
        take:    5,
      },
      tasks: {
        where:   { status: "pending" },
        select:  { title: true, dueAt: true, priority: true },
        orderBy: { dueAt: "asc" },
        take:    5,
      },
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
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

  const messages = contact.conversations[0]?.messages.reverse() ?? [];
  const tags     = contact.tags.map((t) => t.tag.name);

  const userPrompt = `Contato: ${contact.name}
Status: ${contact.status} | Score: ${contact.leadScore}/100
Tags: ${tags.join(", ") || "nenhuma"}
Oportunidades abertas: ${contact.opportunities.map((o) => `${o.title} (R$${o.value}, etapa: ${o.stage.name}, ${o.probability}%)`).join("; ") || "nenhuma"}
Tarefas pendentes: ${contact.tasks.map((t) => `${t.title} (${t.priority})`).join("; ") || "nenhuma"}
Últimas mensagens: ${messages.length > 0 ? messages.map((m) => `[${m.direction === "inbound" ? "contato" : "atendente"}] ${m.content}`).join("\n") : "sem mensagens"}`;

  let summary:   string;
  let keyPoints: string[];
  let nextSteps: string[];
  let sentiment: "positive" | "neutral" | "negative";
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
    sentiment     = VALID.includes(parsed.sentiment as typeof VALID[number]) ? parsed.sentiment as typeof VALID[number] : "neutral";
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
    data: { summary, keyPoints, nextSteps, sentiment, contact: { name: contact.name, leadScore: contact.leadScore } },
  });
}
```

- [ ] **Step 7.2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 7.3: Commit**

```bash
git add app/api/contacts/[id]/summary/route.ts
git commit -m "feat: endpoint GET /api/contacts/[id]/summary com AI 360°"
```

---

## Task 8 — Página de perfil do contato

**Files:**
- Create: `app/(dashboard)/contacts/[id]/page.tsx`

- [ ] **Step 8.1: Criar `app/(dashboard)/contacts/[id]/page.tsx`**

```typescript
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { can } from "@/lib/auth/permissions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, Building2, Tag, Brain } from "lucide-react";
import { ContactSummaryCard } from "@/components/contact-summary-card";

export default async function ContactProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!can(session.user.role, "read", "contacts")) redirect("/dashboard");

  const { id } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: {
      id:        true,
      name:      true,
      email:     true,
      phone:     true,
      status:    true,
      leadScore: true,
      createdAt: true,
      company:   { select: { id: true, name: true } },
      tags:      { select: { tag: { select: { id: true, name: true, color: true } } } },
      opportunities: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id:    true,
          title: true,
          value: true,
          status: true,
          stage: { select: { name: true } },
        },
      },
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 5,
        select: {
          id:            true,
          channel:       true,
          status:        true,
          lastMessageAt: true,
          _count:        { select: { messages: true } },
        },
      },
      tasks: {
        where:   { status: "pending" },
        orderBy: { dueAt: "asc" },
        take: 5,
        select: { id: true, title: true, dueAt: true, priority: true },
      },
    },
  });

  if (!contact) notFound();

  const scoreColor =
    contact.leadScore >= 70 ? "text-red-500"
    : contact.leadScore >= 35 ? "text-yellow-500"
    : "text-blue-500";

  const scoreLabel =
    contact.leadScore >= 70 ? "Hot"
    : contact.leadScore >= 35 ? "Warm"
    : "Cold";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Contatos
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{contact.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
            {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>}
            {contact.company && (
              <Link href={`/companies/${contact.company.id}`} className="flex items-center gap-1 hover:underline">
                <Building2 className="h-3 w-3" />{contact.company.name}
              </Link>
            )}
          </div>
        </div>

        {/* Score badge */}
        <div className="text-right">
          <div className={`text-3xl font-bold ${scoreColor}`}>{contact.leadScore}</div>
          <div className={`text-sm font-medium ${scoreColor}`}>{scoreLabel}</div>
        </div>
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {contact.tags.map(({ tag }) => (
            <Badge key={tag.id} style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color + "40" }} variant="outline">
              <Tag className="h-3 w-3 mr-1" />{tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Resumo IA */}
      <ContactSummaryCard contactId={contact.id} contactName={contact.name} />

      {/* Grid de info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Oportunidades */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contact.opportunities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma oportunidade</p>
            ) : contact.opportunities.map((opp) => (
              <Link key={opp.id} href={`/opportunities`} className="block">
                <div className="text-xs p-2 rounded border hover:bg-accent transition-colors">
                  <div className="font-medium truncate">{opp.title}</div>
                  <div className="text-muted-foreground flex justify-between">
                    <span>{opp.stage.name}</span>
                    <span>R${Number(opp.value).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Tarefas pendentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contact.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente</p>
            ) : contact.tasks.map((task) => (
              <div key={task.id} className="text-xs p-2 rounded border">
                <div className="font-medium truncate">{task.title}</div>
                {task.dueAt && (
                  <div className="text-muted-foreground">
                    {new Date(task.dueAt).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Conversas recentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversas Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contact.conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma conversa</p>
            ) : contact.conversations.map((conv) => (
              <Link key={conv.id} href="/inbox" className="block">
                <div className="text-xs p-2 rounded border hover:bg-accent transition-colors">
                  <div className="flex justify-between">
                    <span className="capitalize font-medium">{conv.channel}</span>
                    <Badge variant={conv.status === "open" ? "default" : "secondary"} className="text-[10px]">
                      {conv.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">{conv._count.messages} mensagens</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2: Criar `components/contact-summary-card.tsx`**

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, CheckSquare } from "lucide-react";

interface SummaryData {
  summary:   string;
  keyPoints: string[];
  nextSteps: string[];
  sentiment: "positive" | "neutral" | "negative";
}

const SENTIMENT_COLOR = {
  positive: "bg-green-100 text-green-800",
  neutral:  "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
};

const SENTIMENT_LABEL = {
  positive: "Positivo",
  neutral:  "Neutro",
  negative: "Negativo",
};

export function ContactSummaryCard({
  contactId,
  contactName,
}: {
  contactId:   string;
  contactName: string;
}) {
  const [data,    setData]    = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}/summary`);
      if (!res.ok) throw new Error("Erro ao carregar resumo");
      const json = await res.json();
      setData(json.data);
    } catch {
      setError("Não foi possível gerar o resumo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            Resumo IA — {contactName}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSummary}
            disabled={loading}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            {data ? "Atualizar" : "Gerar Resumo"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!data && !loading && !error && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Clique em "Gerar Resumo" para que a IA analise o histórico completo deste contato.
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-purple-600 py-4 justify-center">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Analisando histórico...
          </div>
        )}

        {error && <p className="text-xs text-red-500 py-2">{error}</p>}

        {data && (
          <div className="space-y-3">
            {/* Sentiment + summary */}
            <div className="flex items-start gap-2">
              <Badge className={`text-[10px] shrink-0 ${SENTIMENT_COLOR[data.sentiment]}`}>
                {SENTIMENT_LABEL[data.sentiment]}
              </Badge>
              <p className="text-xs leading-relaxed">{data.summary}</p>
            </div>

            {/* Key points */}
            {data.keyPoints.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pontos-chave</p>
                <ul className="space-y-1">
                  {data.keyPoints.map((kp, i) => (
                    <li key={i} className="text-xs flex items-start gap-1">
                      <span className="text-purple-400 mt-0.5">•</span>
                      {kp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next steps */}
            {data.nextSteps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Próximos Passos</p>
                <ul className="space-y-1">
                  {data.nextSteps.map((step, i) => (
                    <li key={i} className="text-xs flex items-start gap-1 text-purple-700">
                      <CheckSquare className="h-3 w-3 mt-0.5 shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 8.3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 8.4: Commit**

```bash
git add app/(dashboard)/contacts/[id]/page.tsx components/contact-summary-card.tsx
git commit -m "feat: página de perfil do contato com resumo IA 360°"
```

---

## Task 9 — AI score badge nos cards de contato

**Files:**
- Modify: `app/(dashboard)/contacts/contacts-client.tsx`

- [ ] **Step 9.1: Ler o arquivo atual para entender a estrutura dos cards**

Abrir `app/(dashboard)/contacts/contacts-client.tsx` e localizar onde o contato é renderizado na listagem.

- [ ] **Step 9.2: Adicionar link para o perfil e badge de score nos cards**

Localizar o trecho que renderiza cada contato e adicionar:

1. Wrap do nome em `<Link href={`/contacts/${contact.id}`}>` para torná-lo clicável
2. Badge de score ao lado do nome:

```typescript
// Adicionar esta função helper no início do componente (fora do JSX)
function ScoreBadge({ score }: { score: number }) {
  if (score === 0) return null;
  const isHot  = score >= 70;
  const isWarm = score >= 35;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
        isHot  ? "bg-red-100 text-red-700" :
        isWarm ? "bg-yellow-100 text-yellow-700" :
                 "bg-blue-100 text-blue-700"
      }`}
    >
      {isHot ? "🔴" : isWarm ? "🟡" : "🔵"} {score}
    </span>
  );
}
```

- [ ] **Step 9.3: Verificar que `contacts-client.tsx` recebe `leadScore` do servidor**

Abrir `app/(dashboard)/contacts/page.tsx` e verificar que o `select` inclui `leadScore`. Se não incluir, adicionar:

```typescript
// No select do prisma.contact.findMany:
select: {
  id:        true,
  name:      true,
  email:     true,
  phone:     true,
  status:    true,
  leadScore: true,   // ← adicionar esta linha
  createdAt: true,
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
},
```

- [ ] **Step 9.4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 9.5: Commit**

```bash
git add app/(dashboard)/contacts/
git commit -m "feat: score badge IA nos cards de contato + link para perfil"
```

---

## Task 10 — Suggest-reply chips no inbox

**Files:**
- Modify: `app/(dashboard)/inbox/inbox-client.tsx`

> O backend de suggest-reply já existe e funciona. Esta task conecta a UI ao endpoint existente.

- [ ] **Step 10.1: Verificar o endpoint atual**

```bash
curl -s http://localhost:3000/api/conversations/00000000-0000-0000-0000-000000000040/suggest-reply \
  -H "Cookie: $(cat /tmp/session-cookie 2>/dev/null || echo '')" | head -c 200
```

- [ ] **Step 10.2: Localizar o campo de mensagem no `inbox-client.tsx`**

Abrir `app/(dashboard)/inbox/inbox-client.tsx`. Localizar o `<textarea>` ou `<input>` do campo de mensagem e a state `replyText` (ou similar).

- [ ] **Step 10.3: Adicionar hook de sugestões e chips de UI**

Localizar o `useEffect` ou seção de state do componente e adicionar:

```typescript
// Estados para sugestões (adicionar junto aos outros useState)
const [suggestions, setSuggestions] = useState<
  Array<{ tone: string; text: string }> | null
>(null);
const [loadingSuggestions, setLoadingSuggestions] = useState(false);

// Função para carregar sugestões (adicionar antes do return)
async function loadSuggestions(conversationId: string) {
  setLoadingSuggestions(true);
  setSuggestions(null);
  try {
    const res = await fetch(`/api/conversations/${conversationId}/suggest-reply`);
    if (!res.ok) return;
    const json = await res.json();
    // O endpoint retorna { data: { suggestion, tone, confidence } }
    // Adaptamos para mostrar 1 sugestão (expandir para 3 em versão futura)
    if (json.data?.suggestion) {
      setSuggestions([{ tone: json.data.tone ?? "professional", text: json.data.suggestion }]);
    }
  } catch {
    // falha silenciosa
  } finally {
    setLoadingSuggestions(false);
  }
}
```

- [ ] **Step 10.4: Chamar `loadSuggestions` ao trocar de conversa ativa**

Localizar o `useEffect` que reage à mudança de conversa ativa (deve existir um) e adicionar:

```typescript
// Dentro do useEffect que observa `active`:
if (active?.id) {
  loadSuggestions(active.id);
} else {
  setSuggestions(null);
}
```

- [ ] **Step 10.5: Renderizar chips abaixo do campo de texto**

Localizar o campo de mensagem no JSX e adicionar abaixo dele:

```typescript
{/* Sugestões de IA */}
{loadingSuggestions && (
  <div className="flex items-center gap-1 text-xs text-purple-500 mt-1">
    <span className="animate-pulse">●</span> IA gerando sugestão...
  </div>
)}
{suggestions && suggestions.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {suggestions.map((s, i) => (
      <button
        key={i}
        type="button"
        onClick={() => {
          // Substituir setReplyText pelo nome correto do setter no componente
          setReplyText(s.text);
          setSuggestions(null);
        }}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
      >
        <span>✨</span>
        {s.tone === "professional" ? "Profissional" : s.tone === "friendly" ? "Amigável" : "Empático"}
      </button>
    ))}
    <button
      type="button"
      onClick={() => active?.id && loadSuggestions(active.id)}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-50 text-gray-500 border hover:bg-gray-100 transition-colors"
    >
      ↺ Nova sugestão
    </button>
  </div>
)}
```

> **Nota:** Substitua `setReplyText` pelo nome real do setter de texto de resposta usado no componente. Inspecione o arquivo para identificar o nome correto antes de editar.

- [ ] **Step 10.6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 10.7: Commit**

```bash
git add app/(dashboard)/inbox/inbox-client.tsx
git commit -m "feat: chips de sugestão IA no inbox (suggest-reply)"
```

---

## Task 11 — Seção de gargalos no dashboard

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 11.1: Adicionar fetch de gargalos ao dashboard (Server Component)**

Abrir `app/(dashboard)/dashboard/page.tsx`. Adicionar chamada ao detectStalledLeads junto aos outros dados do dashboard:

```typescript
// Adicionar import no topo
import { detectStalledLeads } from "@/lib/ai/actions/detect-stalled-leads";

// Dentro da função do Server Component, junto aos outros fetches:
const stalledLeads = await detectStalledLeads(session.user.tenantId).catch(() => []);
```

- [ ] **Step 11.2: Renderizar seção de gargalos**

Adicionar no JSX do dashboard (após os KPIs existentes):

```typescript
{/* Gargalos detectados pela IA */}
{stalledLeads.length > 0 && (
  <section>
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
      <span className="text-orange-500">⚠</span>
      Gargalos detectados pela IA ({stalledLeads.length})
    </h2>
    <div className="grid gap-2">
      {stalledLeads.slice(0, 5).map((lead) => (
        <div
          key={lead.id}
          className={`flex items-start justify-between p-3 rounded-lg border text-sm ${
            lead.urgency === "high"   ? "border-red-200 bg-red-50" :
            lead.urgency === "medium" ? "border-orange-200 bg-orange-50" :
                                        "border-yellow-200 bg-yellow-50"
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{lead.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{lead.reason}</p>
            <p className="text-xs font-medium text-gray-700 mt-1">→ {lead.recommendedAction}</p>
          </div>
          <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              lead.urgency === "high"   ? "bg-red-200 text-red-800" :
              lead.urgency === "medium" ? "bg-orange-200 text-orange-800" :
                                          "bg-yellow-200 text-yellow-800"
            }`}>
              {lead.stalledDays}d
            </span>
          </div>
        </div>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 11.3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 11.4: Commit**

```bash
git add app/(dashboard)/dashboard/page.tsx
git commit -m "feat: seção de gargalos IA no dashboard com urgência e ação recomendada"
```

---

## Task 12 — Crons no `vercel.json` + proteção CRON_SECRET

**Files:**
- Modify: `vercel.json`

- [ ] **Step 12.1: Atualizar `vercel.json` com crons**

Substituir o conteúdo completo:

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install --include=dev",
  "framework": "nextjs",
  "regions": ["gru1"],
  "crons": [
    {
      "path": "/api/ai/follow-up",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/ai/stalled",
      "schedule": "0 8 * * *"
    }
  ]
}
```

> **Nota:** Vercel Cron Jobs enviam `Authorization: Bearer <CRON_SECRET>` automaticamente quando `CRON_SECRET` está configurado nas variáveis de ambiente do projeto Vercel. Configurar em: Vercel Dashboard → Project → Settings → Environment Variables.

- [ ] **Step 12.2: Build final de validação**

```bash
npm run build 2>&1
```

Esperado:
```
✓ Compiled successfully
✓ Generating static pages (34/34)
```
Sem erros de compilação. O número de páginas pode aumentar com as novas rotas.

- [ ] **Step 12.3: Verificar lint (apenas produção)**

```bash
npm run lint 2>&1 | grep "error" | grep -v "scripts/" | grep -v "no-explicit-any" | grep -v "setState"
```

Esperado: nenhuma linha de output (zero novos erros).

- [ ] **Step 12.4: Commit final**

```bash
git add vercel.json
git commit -m "feat: Vercel crons — follow-up horário + stalled diário 8h"
```

---

## Checklist de validação pós-implementação

- [ ] `npx tsc --noEmit` → zero erros
- [ ] `npm run build` → zero erros, todas as páginas compiladas
- [ ] Seed rodou: `npx tsx prisma/seed.ts` → `✅ Seed concluído!`
- [ ] Login funciona: `admin@acme.com.br / senha123`
- [ ] Criar contato → `leadScore` aparece no card (pode ser 0 se sem API key)
- [ ] Abrir conversa → chips de sugestão aparecem dentro de ~3s
- [ ] Dashboard → seção "Gargalos" aparece se houver leads parados
- [ ] `GET /api/contacts/<id>/summary` → retorna JSON com `summary`, `keyPoints`, `nextSteps`
- [ ] `POST /api/ai/follow-up` com header `Authorization: Bearer <CRON_SECRET>` → `{ ok: true }`
- [ ] Com `AI_PROVIDER=gemini` + `GOOGLE_AI_API_KEY`: todas as calls usam Gemini (verificar `modelProvider` no `AiLog`)
- [ ] Com `AI_PROVIDER=claude` + `ANTHROPIC_API_KEY`: todas as calls usam Claude

---

## Variáveis de ambiente — referência final

```bash
# Desenvolvimento (gratuito)
AI_PROVIDER=gemini
GOOGLE_AI_API_KEY=AIza...          # aistudio.google.com

# Produção (Claude)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...       # console.anthropic.com

# Cron jobs (gerar com: openssl rand -hex 32)
CRON_SECRET=<string aleatória>

# Banco local (Supabase CLI)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

---

*Plano gerado em 2026-05-09 — CRM PLUS IA Real Sprint 1*
