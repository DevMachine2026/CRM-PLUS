# Design Spec — Grupo A: Schema Foundations

**Data:** 2026-05-10  
**Status:** Aprovado  
**Itens:** 6.1 OpportunityStageHistory · 6.2 Tags polimórficas · 6.3 Integrations + WebhookLog · 6.4 UserGoals · 6.5 Message type/isInternal

---

## Contexto

Este grupo cobre exclusivamente adições ao schema Prisma + migrations PostgreSQL. Nenhuma UI, nenhuma rota de API e nenhuma lógica de negócio são implementadas aqui — apenas as estruturas de dados que os grupos B, C, D e E precisam para funcionar.

Dependências diretas desbloqueadas:
- **Grupo B** (Kanban IA): depende de `opportunity_stage_history` (6.1)
- **Grupo D** (Reports & Goals): depende de `user_goals` (6.4)
- Tagging em empresas/oportunidades/conversas: depende de 6.2

---

## 6.1 — OpportunityStageHistory

### Propósito
Registrar cada movimentação de card entre stages do pipeline, com rastreamento de origem (manual, IA ou automação). Necessário para auditoria, relatórios de velocidade de funil e para o detect-stage-advance (Grupo B).

### Schema

```prisma
model OpportunityStageHistory {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String   @map("tenant_id") @db.Uuid
  opportunityId   String   @map("opportunity_id") @db.Uuid
  fromStageId     String?  @map("from_stage_id") @db.Uuid   // null = criação do card
  toStageId       String   @map("to_stage_id") @db.Uuid
  movedByUserId   String?  @map("moved_by_user_id") @db.Uuid // null = IA ou automação
  source          String   // "manual" | "ai" | "automation"
  createdAt       DateTime @default(now()) @map("created_at")

  tenant      Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  opportunity Opportunity   @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  fromStage   PipelineStage? @relation("FromStage", fields: [fromStageId], references: [id], onDelete: SetNull)
  toStage     PipelineStage  @relation("ToStage", fields: [toStageId], references: [id])
  movedByUser User?          @relation(fields: [movedByUserId], references: [id], onDelete: SetNull)

  @@index([opportunityId])
  @@index([tenantId])
  @@index([tenantId, createdAt])
  @@map("opportunity_stage_history")
}
```

### Notas
- `fromStageId = null` identifica o registro de criação da oportunidade.
- `source` é string (não enum) para manter flexibilidade sem custo de migration futura.
- `movedByUserId = null` + `source = "ai"` identifica movimentos automáticos.
- Não atualiza: só inserts (append-only). Nunca deletar histórico.
- Os modelos `Opportunity`, `PipelineStage`, `User` e `Tenant` precisam de back-relations adicionadas.

---

## 6.2 — Tags Polimórficas

### Propósito
Estender o sistema de tags (atualmente só em contatos) para empresas, oportunidades e conversas, seguindo o padrão já estabelecido pelo `ContactTag`.

### Decisão de design
Tabelas de join separadas (não polimorfismo com `taggable_type`), porque:
- Prisma não suporta relações polimórficas nativamente
- Preserva foreign keys reais no banco (integridade referencial)
- Consistente com `ContactTag` existente

### Schema — 3 novas join tables

```prisma
model CompanyTag {
  companyId String   @map("company_id") @db.Uuid
  tagId     String   @map("tag_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  tag     Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([companyId, tagId])
  @@map("company_tags")
}

model OpportunityTag {
  opportunityId String   @map("opportunity_id") @db.Uuid
  tagId         String   @map("tag_id") @db.Uuid
  createdAt     DateTime @default(now()) @map("created_at")

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  tag         Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([opportunityId, tagId])
  @@map("opportunity_tags")
}

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

### Alterações em modelos existentes
- `Tag`: adicionar relações `companies CompanyTag[]`, `opportunities OpportunityTag[]`, `conversations ConversationTag[]`
- `Company`: adicionar relação `tags CompanyTag[]`
- `Opportunity`: adicionar relação `tags OpportunityTag[]`
- `Conversation`: adicionar relação `tags ConversationTag[]`
- `Tenant`: adicionar back-relations para as 3 novas join tables

---

## 6.3 — Integrations + WebhookLog

### Propósito
Modelar credenciais de canais de mensagem por tenant (`integrations`) e registrar cada evento recebido via webhook para auditoria e debugging (`webhook_logs`).

### Escopo
Apenas canais de mensagem: `whatsapp`, `instagram`, `email` (usando o enum `ConversationChannel` já existente). Sem integrações genéricas.

### Schema

```prisma
model Integration {
  id          String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String              @map("tenant_id") @db.Uuid
  channelType ConversationChannel @map("channel_type")
  name        String              // label amigável: "WhatsApp Principal"
  credentials Json                // armazenado criptografado na aplicação
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

model WebhookLog {
  id            String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String              @map("tenant_id") @db.Uuid
  integrationId String?             @map("integration_id") @db.Uuid
  channel       ConversationChannel
  payload       Json
  status        String              @default("received") // "received" | "processed" | "failed" | "ignored"
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

### Notas
- `credentials` (Json) deve ser criptografado na camada de aplicação antes de persistir — não no banco.
- `WebhookLog` é append-only. Registrar mesmo webhooks que falham (`status = "failed"`).
- `integrationId` pode ser null para webhooks recebidos antes de a integração ser cadastrada ou de canais desconhecidos.

---

## 6.4 — UserGoals

### Propósito
Definir metas individuais por vendedor por período, habilitando o relatório de progresso (Grupo D — item 7.7).

### Decisão de design
Uma linha por `(user_id, target_type, starts_at)` via `@@unique`. Um vendedor pode ter meta de receita E de deals_won no mesmo mês (duas linhas distintas).

### Schema

```prisma
model UserGoal {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  targetType  String   @map("target_type")   // "revenue" | "deals_won" | "conversations_handled"
  targetValue Decimal  @map("target_value") @db.Decimal(14, 2)
  periodType  String   @map("period_type")   // "monthly" | "quarterly"
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

### Alterações em modelos existentes
- `User`: adicionar relação `goals UserGoal[]`
- `Tenant`: adicionar back-relation `userGoals UserGoal[]`

---

## 6.5 — Message: type + isInternal

### Propósito
Distinguir tipo de mídia da mensagem (`text | image | audio`) e identificar notas internas da equipe que não são enviadas ao contato.

### Alterações no modelo Message existente

```prisma
// Adicionar estes dois campos ao modelo Message:
type       String  @default("text")            // "text" | "image" | "audio"
isInternal Boolean @default(false) @map("is_internal")
```

### Comportamento
- `isInternal = true`: nota interna — renderizada diferente no inbox (ex: fundo amarelo), não despachada para o canal externo.
- `type` orienta a renderização no inbox: texto simples, preview de imagem ou player de áudio.
- Ambos têm `@default`, portanto a migration é não-destrutiva — registros existentes ficam com `type = "text"` e `isInternal = false`.

---

## Ordem de migration

Executar nessa sequência para respeitar dependências de FK:

1. `6.5` — adicionar campos em `messages` (não-destrutivo, sem novas tabelas)
2. `6.1` — criar `opportunity_stage_history` (depende de `opportunities`, `pipeline_stages`, `users`)
3. `6.2` — criar `company_tags`, `opportunity_tags`, `conversation_tags` (depende de `tags`, entidades alvo)
4. `6.3` — criar `integrations`, `webhook_logs` (independente)
5. `6.4` — criar `user_goals` (depende de `users`)

Cada item gera uma migration Prisma separada com nome descritivo.

---

## Checklist de implementação

- [ ] Atualizar `prisma/schema.prisma` com todos os modelos e back-relations
- [ ] Executar `prisma migrate dev` para cada migration na ordem acima
- [ ] Regenerar o Prisma Client (`prisma generate`)
- [ ] Verificar que `lib/generated/prisma/` está atualizado
- [ ] Não criar rotas de API, componentes ou lógica de negócio — isso pertence aos grupos B–E
