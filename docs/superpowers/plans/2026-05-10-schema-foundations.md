# Schema Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 5 grupos de schema ao banco PostgreSQL via Prisma migrations, sem UI, sem rotas e sem lógica de negócio.

**Architecture:** Cada item gera uma migration Prisma isolada, executada na ordem definida para respeitar dependências de FK. A geração do client (`prisma generate`) ocorre após cada migration para manter os tipos TypeScript sincronizados. O schema usa output customizado em `lib/generated/prisma/`.

**Tech Stack:** Prisma 7.8 · `@prisma/adapter-pg` · PostgreSQL · TypeScript 5 · Next.js 16

---

## Mapa de Arquivos

| Arquivo | Papel |
|---|---|
| `prisma/schema.prisma` | Único arquivo editado manualmente — todos os modelos e campos |
| `prisma/migrations/*/migration.sql` | Gerado automaticamente por `prisma migrate dev` — não editar |
| `lib/generated/prisma/` | Gerado automaticamente por `prisma generate` — não editar |

> **Nunca edite `lib/generated/prisma/` manualmente.** Toda alteração de tipo vem de `prisma generate`.

---

## Pré-requisitos

- `DATABASE_URL` configurado em `.env` e apontando para o banco de desenvolvimento
- `npx prisma migrate status` não retorna migrações pendentes antes de começar

```bash
npx prisma migrate status
```

---

## Task 1: 6.5 — Message: campos `type` e `isInternal`

**Files:**
- Modify: `prisma/schema.prisma` — modelo `Message`

Esta é a migration mais simples e não-destrutiva: adiciona dois campos com `@default`, portanto linhas existentes ficam com `type = "text"` e `isInternal = false` sem nenhuma query de backfill.

- [ ] **Step 1: Adicionar campos ao modelo Message em `prisma/schema.prisma`**

Localize o modelo `Message` (linha ~524) e insira os dois campos novos após `direction`:

```prisma
model Message {
  id             String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  conversationId String           @map("conversation_id") @db.Uuid
  tenantId       String           @map("tenant_id") @db.Uuid
  senderType     SenderType       @default(user)
  senderId       String?          @map("sender_id") @db.Uuid
  content        String
  direction      MessageDirection @default(outbound)
  type           String           @default("text")
  isInternal     Boolean          @default(false) @map("is_internal")
  externalId     String?          @map("external_id")
  externalStatus String?          @map("external_status")
  deliveryError  String?          @map("delivery_error")
  sentAt         DateTime         @default(now()) @map("sent_at")
  createdAt      DateTime         @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([tenantId])
  @@index([sentAt])
  @@map("messages")
}
```

- [ ] **Step 2: Criar e aplicar a migration**

```bash
npx prisma migrate dev --name add-message-type-and-internal
```

Resultado esperado: `The following migration(s) have been applied: .../add-message-type-and-internal/migration.sql`

- [ ] **Step 3: Verificar o SQL gerado**

```bash
cat prisma/migrations/$(ls prisma/migrations | grep add-message-type-and-internal)/migration.sql
```

Deve conter:
```sql
ALTER TABLE "messages" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "messages" ADD COLUMN "is_internal" BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 4: Regenerar o Prisma Client**

```bash
npx prisma generate
```

Resultado esperado: `Generated Prisma Client` sem erros.

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Resultado esperado: saída vazia (zero erros).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ lib/generated/prisma/
git commit -m "feat(schema): add type and isInternal fields to Message"
```

---

## Task 2: 6.1 — OpportunityStageHistory

**Files:**
- Modify: `prisma/schema.prisma` — novo modelo + back-relations em 4 modelos existentes

Registra cada movimentação de card entre stages. Append-only — nunca deletar registros.

- [ ] **Step 1: Adicionar o modelo OpportunityStageHistory ao final de `prisma/schema.prisma`**

Cole após o bloco `// ─── Activity` (antes de `@@map("activities")`... não, depois do fechamento do bloco Activity):

```prisma
// ─── OpportunityStageHistory ──────────────────────────────────────────────────

model OpportunityStageHistory {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String    @map("tenant_id") @db.Uuid
  opportunityId   String    @map("opportunity_id") @db.Uuid
  fromStageId     String?   @map("from_stage_id") @db.Uuid
  toStageId       String    @map("to_stage_id") @db.Uuid
  movedByUserId   String?   @map("moved_by_user_id") @db.Uuid
  source          String    // "manual" | "ai" | "automation"
  createdAt       DateTime  @default(now()) @map("created_at")

  tenant      Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  opportunity Opportunity    @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  fromStage   PipelineStage? @relation("StageHistoryFrom", fields: [fromStageId], references: [id], onDelete: SetNull)
  toStage     PipelineStage  @relation("StageHistoryTo", fields: [toStageId], references: [id])
  movedByUser User?          @relation("StageHistoryMover", fields: [movedByUserId], references: [id], onDelete: SetNull)

  @@index([opportunityId])
  @@index([tenantId])
  @@index([tenantId, createdAt])
  @@map("opportunity_stage_history")
}
```

- [ ] **Step 2: Adicionar back-relation ao modelo `Tenant`**

No modelo `Tenant`, após a linha `automationLogs AutomationLog[]`, adicione:

```prisma
  opportunityStageHistories OpportunityStageHistory[]
```

- [ ] **Step 3: Adicionar back-relation ao modelo `Opportunity`**

No modelo `Opportunity`, após a linha `activities Activity[]`, adicione:

```prisma
  stageHistory  OpportunityStageHistory[]
```

- [ ] **Step 4: Adicionar duas back-relations nomeadas ao modelo `PipelineStage`**

No modelo `PipelineStage`, após a linha `opportunities Opportunity[]`, adicione:

```prisma
  fromHistory OpportunityStageHistory[] @relation("StageHistoryFrom")
  toHistory   OpportunityStageHistory[] @relation("StageHistoryTo")
```

- [ ] **Step 5: Adicionar back-relation ao modelo `User`**

No modelo `User`, após a linha `activities Activity[]`, adicione:

```prisma
  stageMovements OpportunityStageHistory[] @relation("StageHistoryMover")
```

- [ ] **Step 6: Criar e aplicar a migration**

```bash
npx prisma migrate dev --name add-opportunity-stage-history
```

Resultado esperado: migration aplicada sem erros.

- [ ] **Step 7: Verificar o SQL gerado**

```bash
cat prisma/migrations/$(ls prisma/migrations | grep add-opportunity-stage-history)/migration.sql
```

Deve conter `CREATE TABLE "opportunity_stage_history"` com todas as colunas e FKs.

- [ ] **Step 8: Regenerar o Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 9: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Resultado esperado: zero erros.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ lib/generated/prisma/
git commit -m "feat(schema): add OpportunityStageHistory for pipeline audit trail"
```

---

## Task 3: 6.2 — Tags Polimórficas

**Files:**
- Modify: `prisma/schema.prisma` — 3 novos modelos + back-relations em 5 modelos existentes

Segue exatamente o padrão do `ContactTag` já existente. Não altera `ContactTag`.

- [ ] **Step 1: Adicionar os 3 modelos de join ao final de `prisma/schema.prisma`**

Cole após o bloco `// ─── ContactTag`:

```prisma
// ─── CompanyTag (M:N join) ────────────────────────────────────────────────────

model CompanyTag {
  companyId String   @map("company_id") @db.Uuid
  tagId     String   @map("tag_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  tag     Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([companyId, tagId])
  @@map("company_tags")
}

// ─── OpportunityTag (M:N join) ───────────────────────────────────────────────

model OpportunityTag {
  opportunityId String   @map("opportunity_id") @db.Uuid
  tagId         String   @map("tag_id") @db.Uuid
  createdAt     DateTime @default(now()) @map("created_at")

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  tag         Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([opportunityId, tagId])
  @@map("opportunity_tags")
}

// ─── ConversationTag (M:N join) ──────────────────────────────────────────────

model ConversationTag {
  conversationId String   @map("conversation_id") @db.Uuid
  tagId          String   @map("tag_id") @db.Uuid
  createdAt      DateTime @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  tag          Tag          @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([conversationId, tagId])
  @@map("conversation_tags")
}
```

- [ ] **Step 2: Atualizar modelo `Tag` com 3 novas relações**

No modelo `Tag`, após a linha `contacts ContactTag[]`, adicione:

```prisma
  companies     CompanyTag[]
  opportunities OpportunityTag[]
  conversations ConversationTag[]
```

- [ ] **Step 3: Atualizar modelo `Company` com back-relation**

No modelo `Company`, após a linha `invoices Invoice[]`, adicione:

```prisma
  tags CompanyTag[]
```

- [ ] **Step 4: Atualizar modelo `Opportunity` com back-relation**

No modelo `Opportunity`, após a linha `stageHistory OpportunityStageHistory[]` (adicionada na Task 2), adicione:

```prisma
  tags OpportunityTag[]
```

- [ ] **Step 5: Atualizar modelo `Conversation` com back-relation**

No modelo `Conversation`, após a linha `messages Message[]`, adicione:

```prisma
  tags ConversationTag[]
```

> Nota: as join tables de tag não têm `tenantId` — seguem o mesmo padrão do `ContactTag` existente. A integridade de tenant é garantida via Cascade da entidade pai. O Tenant **não** recebe back-relations para essas tabelas.

- [ ] **Step 6: Criar e aplicar a migration**

```bash
npx prisma migrate dev --name add-polymorphic-tags
```

Resultado esperado: migration aplicada criando as 3 tabelas.

- [ ] **Step 7: Verificar o SQL gerado**

```bash
cat prisma/migrations/$(ls prisma/migrations | grep add-polymorphic-tags)/migration.sql
```

Deve conter `CREATE TABLE "company_tags"`, `CREATE TABLE "opportunity_tags"`, `CREATE TABLE "conversation_tags"`.

- [ ] **Step 8: Regenerar o Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 9: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ lib/generated/prisma/
git commit -m "feat(schema): add polymorphic tags for companies, opportunities, conversations"
```

---

## Task 4: 6.3 — Integration + WebhookLog

**Files:**
- Modify: `prisma/schema.prisma` — 2 novos modelos + back-relations no `Tenant`

Modela credenciais de canais de mensagem e log de webhooks recebidos.

- [ ] **Step 1: Adicionar os 2 modelos ao final de `prisma/schema.prisma`**

Cole após o bloco das tags polimórficas (ou no final do arquivo):

```prisma
// ─── Integration ──────────────────────────────────────────────────────────────

model Integration {
  id          String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String              @map("tenant_id") @db.Uuid
  channelType ConversationChannel @map("channel_type")
  name        String
  credentials Json                @default("{}")
  webhookUrl  String?             @map("webhook_url")
  isActive    Boolean             @default(true) @map("is_active")
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  webhookLogs WebhookLog[]

  @@unique([tenantId, channelType, name])
  @@index([tenantId])
  @@map("integrations")
}

// ─── WebhookLog ───────────────────────────────────────────────────────────────

model WebhookLog {
  id            String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String              @map("tenant_id") @db.Uuid
  integrationId String?             @map("integration_id") @db.Uuid
  channel       ConversationChannel
  payload       Json                @default("{}")
  status        String              @default("received")
  error         String?
  processedAt   DateTime?           @map("processed_at")
  createdAt     DateTime            @default(now()) @map("created_at")

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  integration Integration? @relation(fields: [integrationId], references: [id], onDelete: SetNull)

  @@index([tenantId, status, createdAt])
  @@index([integrationId])
  @@map("webhook_logs")
}
```

- [ ] **Step 2: Atualizar modelo `Tenant` com 2 back-relations**

No modelo `Tenant`, após `conversationTags ConversationTag[]`, adicione:

```prisma
  integrations Integration[]
  webhookLogs  WebhookLog[]
```

- [ ] **Step 3: Criar e aplicar a migration**

```bash
npx prisma migrate dev --name add-integrations-and-webhook-logs
```

Resultado esperado: migration aplicada criando as 2 tabelas.

- [ ] **Step 4: Verificar o SQL gerado**

```bash
cat prisma/migrations/$(ls prisma/migrations | grep add-integrations-and-webhook-logs)/migration.sql
```

Deve conter `CREATE TABLE "integrations"` e `CREATE TABLE "webhook_logs"`.

- [ ] **Step 5: Regenerar o Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ lib/generated/prisma/
git commit -m "feat(schema): add Integration and WebhookLog models"
```

---

## Task 5: 6.4 — UserGoal

**Files:**
- Modify: `prisma/schema.prisma` — 1 novo modelo + back-relations em `User` e `Tenant`

Define metas por vendedor por período. Habilita o relatório de progresso (Grupo D).

- [ ] **Step 1: Adicionar o modelo UserGoal ao final de `prisma/schema.prisma`**

```prisma
// ─── UserGoal ─────────────────────────────────────────────────────────────────

model UserGoal {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  targetType  String   @map("target_type")
  targetValue Decimal  @map("target_value") @db.Decimal(14, 2)
  periodType  String   @map("period_type")
  startsAt    DateTime @map("starts_at")
  endsAt      DateTime @map("ends_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, targetType, startsAt])
  @@index([tenantId, userId])
  @@map("user_goals")
}
```

Valores válidos para `targetType`: `"revenue"` | `"deals_won"` | `"conversations_handled"`  
Valores válidos para `periodType`: `"monthly"` | `"quarterly"`  
(validados na aplicação, não no banco)

- [ ] **Step 2: Atualizar modelo `User` com back-relation**

No modelo `User`, após `stageMovements OpportunityStageHistory[] @relation("StageHistoryMover")`, adicione:

```prisma
  goals UserGoal[]
```

- [ ] **Step 3: Atualizar modelo `Tenant` com back-relation**

No modelo `Tenant`, após `webhookLogs WebhookLog[]`, adicione:

```prisma
  userGoals UserGoal[]
```

- [ ] **Step 4: Criar e aplicar a migration**

```bash
npx prisma migrate dev --name add-user-goals
```

Resultado esperado: migration aplicada criando a tabela `user_goals`.

- [ ] **Step 5: Verificar o SQL gerado**

```bash
cat prisma/migrations/$(ls prisma/migrations | grep add-user-goals)/migration.sql
```

Deve conter `CREATE TABLE "user_goals"` com constraint `UNIQUE("user_id", "target_type", "starts_at")`.

- [ ] **Step 6: Regenerar o Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 7: Verificar TypeScript final — schema completo**

```bash
npx tsc --noEmit
```

Resultado esperado: zero erros em todo o projeto.

- [ ] **Step 8: Verificar lint**

```bash
npm run lint
```

- [ ] **Step 9: Commit final**

```bash
git add prisma/schema.prisma prisma/migrations/ lib/generated/prisma/
git commit -m "feat(schema): add UserGoal model for per-salesperson targets"
```

---

## Verificação Final

Após todas as 5 tasks, confirme que o banco tem todas as tabelas novas:

```bash
npx prisma studio
```

Tabelas que devem aparecer no Prisma Studio:
- `messages` — com colunas `type` e `is_internal`
- `opportunity_stage_history` — nova tabela
- `company_tags` — nova tabela
- `opportunity_tags` — nova tabela
- `conversation_tags` — nova tabela
- `integrations` — nova tabela
- `webhook_logs` — nova tabela
- `user_goals` — nova tabela
