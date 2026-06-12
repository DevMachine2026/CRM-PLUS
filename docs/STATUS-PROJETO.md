# CRM PLUS — Panorama Completo do Projeto

> Documento de handoff técnico. Estado do projeto em **12/06/2026**. Destinado a ser
> lido por outra IA/desenvolvedor para entender rapidamente arquitetura, decisões e pendências.

---

## 1. O que é

CRM PLUS é um **CRM multi-tenant com IA nativa**, voltado a PMEs brasileiras, com forte
integração a **WhatsApp** e **Instagram**. O diferencial central é a IA que atua sobre as
conversas: qualifica leads (lead score), cria oportunidades, resume conversas, sugere
respostas, gera tarefas e **avança automaticamente os cards no Kanban** conforme o
atendimento evolui.

- **Tenant principal em produção**: "Uala Car" (lava-rápido / serviços automotivos).
- **Idioma da aplicação e do código**: Português (BR).

---

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16.2.4** (App Router, React 19.2) |
| Linguagem | TypeScript 5 |
| ORM | **Prisma 7.8** com **driver adapter `@prisma/adapter-pg`** (pool `pg`) |
| Banco | **Neon Postgres 17** (serverless, região sa-east-1) |
| Auth | **NextAuth v5 (beta)** + bcryptjs |
| UI | Tailwind CSS 4, shadcn-style (Base UI / Radix), lucide-react |
| Estado | Zustand, React Query (TanStack) |
| Validação | Zod 4 |
| Deploy | **Vercel** (https://crm-plus-kappa.vercel.app) |
| IA | **DeepSeek** (ativo), Google Gemini, Anthropic Claude, mock |
| WhatsApp | Evolution API (whatsmeow) e Z-API (por tenant) |

Observação importante (do `AGENTS.md`): esta versão do Next.js tem breaking changes;
consultar `node_modules/next/dist/docs/` antes de assumir APIs antigas.

---

## 3. Arquitetura e estrutura

```
app/
  (dashboard)/        # páginas autenticadas (dashboard, inbox, contacts, opportunities, etc.)
  api/                # ~67 route handlers (REST interno + webhooks + cron)
lib/
  ai/                 # provider + actions de IA + settings por tenant
  import/             # importação CSV (contacts, products, opportunities)
  auth/               # sessão e RBAC (permissions.ts)
  db/                 # client Prisma (adapter pg) + ensure-default-pipeline
  generated/prisma/   # client Prisma gerado (versionado)
prisma/
  schema.prisma       # 30 models
  migrations/         # histórico (parcial — ver §11)
components/           # UI reutilizável
docs/                 # documentação
```

Conexão com o banco:
- **Runtime** (`lib/db/client.ts`): `PrismaClient` com adapter `pg` usando `DATABASE_URL` (host **pooled**).
- **Prisma CLI** (`prisma.config.ts`): usa `DIRECT_URL` (host **direto**, sem `-pooler`) com fallback para `DATABASE_URL`.

---

## 4. Modelo de dados (30 models)

**Núcleo CRM**: `Tenant`, `User`, `Session`, `PasswordResetToken`, `Company`, `Contact`,
`Product`, `Tag`, `ContactTag`, `CompanyTag`, `OpportunityTag`, `ConversationTag`.

**Funil/vendas**: `Pipeline`, `PipelineStage`, `Opportunity`, `OpportunityProduct`,
`OpportunityStageHistory`, `Revenue`.

**Atendimento/IA**: `Conversation`, `Message`, `AiLog`, `Activity`, `Task`, `UserGoal`.

**Financeiro**: `Invoice`, `InvoiceItem`.

**Automação/integração**: `Automation`, `AutomationLog`, `Integration`, `WebhookLog`.

Pontos relevantes:
- **Multi-tenant por `tenantId`** em quase todos os models (isolamento lógico).
- `Contact.externalId` e (novo) `Opportunity.externalId` → dedup idempotente e rastreabilidade
  de migração de outros CRMs. Ambos com índice `(tenant_id, external_id)`.
- `Opportunity.status`: `open | won | lost`; `OpportunityStageHistory` registra cada movimento
  com `source` = `manual | ai | automation`.
- `AiLog` registra cada chamada de IA (provider, modelo, tokens, resumo do output, fallback).

---

## 5. Módulos / páginas (App Router)

- **Dashboard** — métricas e visão geral.
- **Inbox** — conversas omnichannel (WhatsApp/Instagram), ordenadas por última mensagem;
  exibe dados de IA (resumo, intenção, sugestões).
- **Conversations/[id]** — thread + ações de IA (resumir, sugerir resposta, detectar intenção).
- **Contacts** (lista, [id], new) — com tags, score, `externalId`.
- **Companies** (lista, [id]).
- **Opportunities** + **Pipeline** — Kanban de funil; cards movidos manualmente ou pela IA.
- **Products**, **Tags**, **Tasks**, **Team**, **Reports**, **Automations**.
- **Billing/[id]** — faturas.
- **Settings** — empresa, marca (branding), **Migrar de outro CRM**, equipe, config de IA.
- **Settings/Integrations** + **guia-meta** — WhatsApp/Instagram (Meta).

---

## 6. Camada de IA

`lib/ai/provider.ts` — wrapper central de completions.
- **Resolução de provider** via `AI_PROVIDER`: `deepseek` (atual) → `gemini` → `claude` → `mock`.
- **Tiers** por action: `fast` / `quality`.
  - DeepSeek: `deepseek-chat` (ambos). Gemini: `gemini-2.5-flash`. Claude: `haiku-4-5` / `sonnet-4-6`.
- DeepSeek usa API compatível com OpenAI (`https://api.deepseek.com`).
- Erros não caem silenciosamente: o motivo do fallback é logado e gravado no `AiLog.outputSummary`.

**Decisão importante**: o Gemini free tier desta conta tem cota 0 em vários modelos
(429), por isso a produção migrou para **DeepSeek** (pago, barato, bom em JSON).

Actions de IA (`lib/ai/actions/`):
- `classify-lead` — qualifica (lead score), cria oportunidade, gera tarefa e dispara avanço de estágio.
- `summarize-conversation` — resumo da conversa.
- `detect-intent` — intenção da mensagem.
- `detect-stage-advance` — reavalia e **move o card no Kanban**; ao chegar ao estágio final,
  marca a oportunidade como `won` e seta `closedAt`.
- `detect-stalled-leads` — leads parados.
- `suggest-reply`, `suggest-next-action`, `create-task-from-message`, `auto-tag`, `follow-up`.

**Fluxo automático**: a cada mensagem relevante → `classifyLead` → (cria/atualiza oportunidade)
→ `detectStageAdvance` (move de coluna conforme a conversa evolui). Confiança mínima ~65% para mover.

Config por tenant: `lib/ai/tenant-settings*.ts` e `tenant-prompt.ts` (prompt e flags como `aiEnabled`).

---

## 7. Integrações

- **WhatsApp via Evolution API** (whatsmeow/REST): webhooks em `/api/webhooks/evolution`,
  health check via cron (`/api/cron/evolution-health`), QR/sessão em `/api/integrations/whatsapp/*`.
  Controlado por `ENABLE_EVOLUTION` e config de instância.
- **WhatsApp via Z-API** (alguns tenants): rota outbound específica; UI adapta botões
  ("Abrir no WhatsApp") quando não há rota de envio.
- **Instagram via Meta**: OAuth (`/api/integrations/instagram/oauth/*`), webhooks
  (`/api/webhooks/instagram`). Guia técnico em Settings › Integrations › guia-meta.
- `Integration` e `WebhookLog` persistem credenciais (criptografar na camada de app) e logs.

---

## 8. Importação / Migração de dados (CSV)

Infra unificada em `lib/import/` (parser próprio, sem dependência externa):
- **Contatos** — nome, email, telefone, empresa, status, `external_id`. Dedup por email/telefone/externalId.
- **Produtos** — nome, preço (`R$ 1.490,00` ou `1490.00`), categoria, status.
- **Oportunidades/Negócios (NOVO)** — título, valor, status, estágio (casa pelo nome do funil),
  contato (vincula ou cria), data prevista, observações, `external_id`. Dedup idempotente por `external_id`.

Padrões: reconhecimento automático de colunas (aliases de HubSpot/Pipedrive/RD/planilhas),
fluxo de 2 passos (preview → confirmar), limite 3000 linhas, lotes de 50 em transação.
UI em **Settings › Migrar de outro CRM** (`components/settings/data-import-section.tsx`).
APIs: `/api/import/{contacts,products,opportunities}` (+ `/preview`) e `/api/import/template/[type]`.

---

## 9. Autenticação e RBAC

NextAuth v5. RBAC em `lib/auth/permissions.ts` com `can(role, action, resource)`.
- **Roles**: `super_admin`, `owner`, `manager`, `salesperson`, `attendant`, `financial`, `viewer`.
- **Actions**: `create | read | update | delete | export | admin`.
- **Resources**: contacts, companies, products, tags, pipelines, opportunities, billing,
  conversations, tasks, team, automations, reports, settings, integrations, ai_logs.

---

## 10. Deploy e infraestrutura

- **App**: Vercel (projeto `CRM-PLUS`, branch `master` → deploy automático). Build: `prisma generate && next build`.
- **Banco**: Neon (projeto `winter-butterfly-71139861`, conta `devmachine.financas@gmail.com`).
  > Atenção: o MCP do Neon configurado está em **outra** conta (org RONALD) e **não** acessa esse projeto.
- **Outros serviços** (Evolution API): Render.
- Schema aplicado historicamente via `prisma db push` / SQL Editor do Neon (não via `migrate deploy`).

---

## 11. Variáveis de ambiente principais

```
DATABASE_URL      # Neon pooled (-pooler) — runtime
DIRECT_URL        # Neon direto (sem -pooler) — Prisma CLI/migrations
NEXTAUTH_SECRET / AUTH_SECRET / NEXTAUTH_URL
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY  # (definida também na Vercel)
GOOGLE_AI_API_KEY / ANTHROPIC_API_KEY  # opcionais
AI_MODEL_* / AI_MODEL_DEEPSEEK_* / AI_MODEL_GEMINI_*  # override de modelos
ENABLE_EVOLUTION / EVOLUTION_API_URL / EVOLUTION_API_KEY
CRON_SECRET
```

---

## 12. Histórico recente (commits relevantes)

- `feat(import)`: importação de oportunidades via CSV com `external_id`.
- `chore(db)`: Prisma CLI usando conexão direta do Neon (`DIRECT_URL`).
- `refactor(integrations)`: remoção do checklist técnico da Meta da tela do usuário.
- `feat(ai)`: avanço automático de estágio no Kanban + marcar oportunidade como ganha no estágio final.
- `feat(ai)`: DeepSeek como provider de produção.
- `fix`: ordenação do inbox por última mensagem; correção de modelo Gemini; logs de fallback de IA.
- `feat(contacts)`: persistência/merge de contatos do WhatsApp.

---

## 13. Limitações conhecidas / pendências

- **Drift de migrations**: `prisma migrate status` lista migrations como "não aplicadas"
  porque o schema foi aplicado via `db push`/SQL Editor. As colunas existem; **não quebra deploy**
  (build só roda `prisma generate`). Migração nova foi marcada com `migrate resolve --applied`.
- **Probabilidade por oportunidade não editável** (é a nível de estágio, by design).
- **Drag-and-drop do Kanban indisponível no mobile** (usa tabela como fallback).
- **Tempo de carga do dashboard não medido** (requer instrumentação em runtime).
- **DeepSeek depende de créditos** na conta; sem créditos/sem key, cai para mock (logado).
- **Credenciais de integração**: lembrar de criptografar na camada de aplicação antes de gravar.

---

## 14. Como rodar localmente

```bash
npm install                 # postinstall roda prisma generate
# configurar .env.local (ver §11; usar DATABASE_URL + DIRECT_URL do Neon)
npm run dev                 # Next dev
npx prisma studio           # inspecionar o banco (usa DIRECT_URL)
npm run db:seed             # popular dados (tsx prisma/seed.ts)
```

Migrations no Neon: usar `DIRECT_URL` (host sem `-pooler`); se der `P1001`, o banco pode
estar em scale-to-zero (repetir) ou o IP fora da allow-list.
