# Auditoria de Arquitetura — CRM PLUS (MVP)

> **Data:** 20/05/2026  
> **Escopo:** Estado real do código, sem propostas futuristas.  
> **Objetivo MVP:** WhatsApp → IA interpreta → lead salvo → exibir no CRM.

---

# 1. STACK IDENTIFICADA

| Camada | Tecnologia | Função no sistema |
|--------|------------|-------------------|
| **Frontend** | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 | UI SSR/CSR, páginas dashboard, inbox, settings |
| **Componentes UI** | shadcn + Base UI (`@base-ui/react`), lucide-react, CVA | Design system, forms, sheets, dialogs |
| **Estado cliente** | TanStack Query, Zustand, react-hook-form + Zod | Fetch cache, forms validados |
| **Backend** | Next.js Route Handlers (`app/api/**/route.ts`) | REST API monolítica no mesmo repo |
| **ORM / DB** | Prisma 7 + `@prisma/adapter-pg` + PostgreSQL | Modelagem, queries, migrations |
| **Auth** | Auth.js (NextAuth v5 beta), bcryptjs, sessões em DB | Login, registro, multi-tenant via `session.tenantId` |
| **IA** | `lib/ai/provider.ts` — Gemini (`@google/generative-ai`), Claude (`@anthropic-ai/sdk`), mock | Completions JSON/texto; tier fast/quality |
| **E-mail** | Resend (`lib/email/send.ts`) | Reset de senha (opcional se `RESEND_API_KEY` vazio) |
| **WhatsApp inbound (prod.)** | Evolution API client (`lib/integrations/evolution-client.ts`) | QR, instância, webhook Evolution |
| **WhatsApp outbound** | Meta Graph API v21 (`lib/channels/whatsapp.ts`) | Envio Cloud API — **não Evolution** |
| **Instagram** | Meta Graph (`lib/channels/instagram.ts`) | Outbound; inbound via webhook Meta |
| **Proxy auth** | `proxy.ts` (NextAuth middleware) | Protege rotas exceto estáticos |
| **Deploy previsto** | Vercel (`vercel.json`, região `gru1`) | Build Next + crons horários |
| **Crons** | `/api/ai/follow-up` (hourly), `/api/ai/stalled` (8h) | Follow-ups e leads parados |

**Variáveis de ambiente relevantes:**

```env
DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, AUTH_SECRET
AI_PROVIDER, GOOGLE_AI_API_KEY, ANTHROPIC_API_KEY
EVOLUTION_API_URL, EVOLUTION_API_KEY          # opcional — demo se ausente
WHATSAPP_*, INSTAGRAM_*                         # Meta Cloud (modo avançado / outbound)
CRON_SECRET, RESEND_API_KEY
```

---

# 2. ESTRUTURA DE PASTAS

```
CRM-PLUS/
├── app/
│   ├── page.tsx                    # Landing pública
│   ├── layout.tsx                  # Root layout + fonts Geist
│   ├── (auth)/                     # login, register, forgot/reset password
│   ├── (dashboard)/                # 21 páginas CRM (inbox, pipeline, etc.)
│   └── api/                        # 51 route handlers REST
├── components/
│   ├── ui/                         # shadcn primitives
│   ├── layout/                     # sidebar, page-header, entity-detail-shell
│   ├── inbox/                      # UI conversas
│   ├── integrations/               # hub WhatsApp/IG/IA
│   ├── settings/, kanban/, automations/
├── lib/
│   ├── ai/                         # provider + 10 actions
│   ├── auth/                       # session, permissions, auth.config
│   ├── automations/                # engine, emit, action-handlers
│   ├── channels/                   # send whatsapp/instagram
│   ├── db/                         # prisma client, with-tenant
│   ├── integrations/               # evolution, provision, credentials
│   ├── webhooks/                   # process-inbound, resolve-tenant, ingest
│   ├── demo/                       # seed demo
│   └── generated/prisma/           # client gerado (output custom)
├── prisma/schema.prisma
├── proxy.ts                        # middleware auth
└── docs/                           # documentação operacional
```

**Organização:** Monorepo Next full-stack coerente. Lógica de negócio em `lib/`, UI em `components/` + `app/(dashboard)/`.

**Problemas estruturais (menores):**

- Duas UIs de integrações: hub novo + `integrations-client.tsx` (modo advanced).
- `lib/ai/index.ts` deprecated vs `lib/ai/provider.ts` (legado).
- `mobile-design.ts` + `design-system.ts` (duplicação parcial de tokens).
- Outbound WhatsApp usa **Meta Graph**, inbound Evolution usa **formato diferente** — duas stack WhatsApp paralelas sem unificação de envio Evolution.

---

# 3. FUNCIONALIDADES — STATUS REAL

Legenda: ✅ total · 🟡 parcial/mock · 🔴 incompleto/quebrado · ➖ não existe

| Funcionalidade | Status | Detalhe |
|----------------|--------|---------|
| **Autenticação** | ✅ | Register cria tenant+owner+setup; login Auth.js; reset senha |
| **Multi-tenant** | ✅ | `tenantId` em todas entidades; sessão amarrada ao tenant |
| **Permissões RBAC** | ✅ | 8 roles em `lib/auth/permissions.ts`; APIs checam `can()` |
| **Dashboard** | ✅ | Métricas + roteiro demo para slug `demo-crmplus` |
| **Contatos (leads)** | ✅ | CRUD, tags, score, detalhe, summary IA |
| **Empresas** | ✅ | CRUD completo |
| **Pipeline / Oportunidades** | ✅ | Kanban, estágios, produtos, histórico |
| **Inbox / Chat** | 🟡 | UI completa; canais reais dependem webhook; outbound simula sem credenciais |
| **Integração WhatsApp (UI)** | 🟡 | Hub QR demo sem Evolution; advanced Meta manual |
| **Integração WhatsApp (real)** | 🔴 | Evolution client pronto mas requer env; sem Evolution send outbound |
| **Integração Instagram** | 🟡 | Demo páginas; OAuth real não implementado |
| **IA Gemini/Claude** | 🟡 | Real se API key; fallback mock em catch de cada action |
| **Switch aiEnabled** | 🔴 | Salvo em settings; **não usado** no pipeline webhook |
| **Webhooks Meta WA/IG** | ✅ | POST simulável; resolve tenant; process inbound |
| **Webhook Evolution** | 🟡 | Implementado; só útil com Evolution + integração demo/real |
| **Automações** | 🟡 | Engine + 3 defaults no register; ações send WA/IG simulam sem creds |
| **Tarefas** | ✅ | CRUD; IA cria via detect-intent |
| **Faturamento** | ✅ | Receitas, faturas, geração |
| **Relatórios** | ✅ | Página reports |
| **Equipe** | ✅ | CRUD usuários tenant |
| **Produtos / Tags** | ✅ | CRUD |
| **Upload arquivos** | ➖ | **Não existe** (sem storage, sem multipart API) |
| **E-mail transacional** | 🟡 | Resend opcional |
| **Crons IA** | 🟡 | Rotas existem; precisam deploy + CRON_SECRET |
| **Demo seed** | ✅ | `npm run db:seed`, `/api/demo/seed` |

---

# 4. FLUXO REAL DO SISTEMA (identificado no código)

## 4.1 MVP desejado — WhatsApp → lead no CRM

### Caminho A — Webhook Meta simulado (funciona HOJE sem Evolution)

```
Cliente (simulado via curl)
  → POST /api/webhooks/whatsapp?tenantId=UUID
  → resolveWhatsAppTenant(phoneNumberId | ?tenantId dev)
  → processInboundMessage()
       ├─ find/create Contact (phone E.164)
       ├─ find/create Conversation (channel=whatsapp)
       ├─ create Message (inbound)
       ├─ se contactCreated → classifyLead() [async]
       └─ summarizeConversation + detectIntent [async fire-and-forget]
  → Inbox exibe conversa
  → Vendedor usa Sugerir resposta (manual)
```

### Caminho B — Evolution (quando EVOLUTION_API_URL configurado)

```
UI: Conectar WhatsApp
  → POST /api/integrations/whatsapp/session
  → provisionIntegration (credentials evolution, webhookUrl)
  → evolution-client: create/connect instance, QR
  → GET polling → connected → setEvolutionWebhook()

Mensagem real:
  WhatsApp celular
  → Evolution API
  → POST /api/webhooks/evolution { instance, event, data }
  → resolveTenantByInstance(evolutionInstanceName)
  → ingestWebhook + processInboundMessage (igual Caminho A)
```

### Caminho C — Instagram

```
POST /api/webhooks/instagram?tenantId=UUID (dev)
  → resolveInstagramTenant(pageId | ?tenantId)
  → processInboundMessage (externalId PSID, channel=instagram)
```

## 4.2 Fluxo IA assistiva (inbox manual)

```
Usuário na Inbox
  → POST /api/conversations/[id]/summarize | detect-intent | suggest-reply
  → lib/ai/actions/*
  → aiComplete (Gemini/Claude) + getTenantAiSystemPrompt
  → persiste summary/intent; suggest-reply retorna JSON (não envia ao cliente)
```

## 4.3 Fluxo outbound (atendente responde)

```
POST /api/conversations/[id]/messages { content }
  → grava Message outbound
  → sendChannelMessage()
       → loadWhatsAppCredentials (Meta accessToken + phoneNumberId do integration OU env)
       → sendWhatsAppMessage → Graph API OU externalStatus="simulated"
```

**Gap crítico:** credenciais Evolution (QR) **não** alimentam `loadWhatsAppCredentials` — só Meta tokens.

---

# 5. INTEGRAÇÃO EVOLUTION API

| Aspecto | Implementação | Status |
|---------|---------------|--------|
| **Arquivo client** | `lib/integrations/evolution-client.ts` | ✅ |
| **Modo demo** | Se `!EVOLUTION_API_URL` → QR SVG fake | ✅ Ativo por padrão |
| **Criar instância** | `POST {BASE}/instance/create` | Só com env |
| **QR / connect** | `GET {BASE}/instance/connect/{name}` | Só com env |
| **Estado** | `GET {BASE}/instance/connectionState/{name}` | Só com env |
| **Registrar webhook Evolution** | `POST {BASE}/webhook/set/{name}` | Só com env; URL `/api/webhooks/evolution` |
| **API routes** | `POST/GET /api/integrations/whatsapp/session` | ✅ |
| **Webhook receptor** | `POST /api/webhooks/evolution` | ✅ |
| **Provision DB** | `provision-integration.ts` upsert por tenant | ✅ |
| **Envio outbound via Evolution** | — | 🔴 **Não implementado** |
| **Auth Evolution** | Header `apikey: EVOLUTION_API_KEY` | Configurável |

**Nome instância:** `crmplus-{tenantId sem hífens, 20 chars}` — idempotente.

**Demo server-side:** após 5s em `awaiting_scan`, GET session auto-marca `connected` com phone fake `5511999990000`.

---

# 6. IMPLEMENTAÇÃO DA IA

## 6.1 Provider (`lib/ai/provider.ts`)

- Resolve: `mock` | `gemini` | `anthropic` (Claude)
- Modelos: Gemini `gemini-2.0-flash` (fast), Claude Haiku/Sonnet via env
- `aiComplete({ system, user, maxTokens, tier })` → texto + tokens
- `parseAIJson()` para respostas estruturadas
- **Toda action tem fallback mock** se API falhar ou JSON inválido

## 6.2 Persona tenant (`lib/ai/tenant-settings.ts` + `tenant-prompt.ts`)

- `Tenant.settings.ai`: `aiEnabled`, `agentName`, `agentTone`, `companyContext`, `systemPrompt`
- `getTenantAiSystemPrompt(tenantId, taskInstruction)` concatena persona + tarefa
- **`aiEnabled` não é consultado** antes de chamar IA nos webhooks

## 6.3 Actions existentes

| Action | Arquivo | Disparo automático | Persiste |
|--------|---------|-------------------|----------|
| classify-lead | `classify-lead.ts` | ✅ webhook (contactCreated), POST contacts | leadScore, tags, ai_log |
| summarize-conversation | `summarize-conversation.ts` | ✅ webhook (async) | conversation.summaryText |
| detect-intent | `detect-intent.ts` | ✅ webhook (async); botão inbox | detectedIntent, task IA |
| suggest-reply | `suggest-reply.ts` | ❌ só manual inbox | ai_log (não envia msg) |
| suggest-next-action | `suggest-next-action.ts` | 🟡 se intent compra + opp aberta | ai_log |
| detect-stage-advance | `detect-stage-advance.ts` | ❌ manual/API | stage history |
| create-task-from-message | `create-task-from-message.ts` | ❌ não wired webhook | task |
| auto-tag | `auto-tag.ts` | ❌ não wired webhook | tags |
| detect-stalled-leads | `detect-stalled-leads.ts` | cron `/api/ai/stalled` | retorno lista |
| follow-up | `follow-up.ts` | cron `/api/ai/follow-up` | tarefas sugeridas |

## 6.4 O que falta para visão "IA preenche CRM sozinha"

| Esperado | Real |
|----------|------|
| Extrair nome, interesse, orçamento da mensagem | 🟡 Parcial via classify + intent (não campos CRM estruturados) |
| Criar oportunidade automaticamente | 🔴 **Não** — webhook não cria Opportunity |
| Preencher empresa/produto da conversa | 🔴 Não |
| Resposta automática ao cliente | 🔴 Não |
| Respeitar switch aiEnabled | 🔴 Não |

---

# 7. BANCO DE DADOS

**Engine:** PostgreSQL via Prisma. **Multi-tenant:** `tenantId` em (quase) todas tabelas.

## Entidades principais

| Model | Papel MVP |
|-------|-----------|
| **Tenant** | Empresa; `settings` JSON (IA) |
| **User** | Usuários; role RBAC |
| **Contact** | **Lead**; phone, externalId, leadScore, status |
| **Conversation** | Thread por canal; summaryText, detectedIntent |
| **Message** | Mensagens; direction, externalId (idempotência) |
| **Opportunity** | Negócio no funil — **criação manual ou API**, não webhook |
| **Integration** | Credenciais JSON por canal + webhookUrl |
| **WebhookLog** | Auditoria webhooks |
| **AiLog** | Auditoria IA |
| **Automation** / **AutomationLog** | Regras JSON + execuções |
| **Task** | Follow-ups; source=`ai` possível |

## Relacionamentos MVP

```
Tenant 1─N Contact 1─N Conversation 1─N Message
Contact 1─N Opportunity (opcional, manual)
Integration N─1 Tenant (unique: tenantId+channelType+name)
```

**Lead = Contact** com `status=lead`. Não há tabela `Lead` separada.

---

# 8. MAPEAMENTO DE WEBHOOKS

| Endpoint | Método | Origem | Função | Status |
|----------|--------|--------|--------|--------|
| `/api/webhooks/whatsapp` | GET | Meta | Verificação hub.challenge | ✅ |
| `/api/webhooks/whatsapp` | POST | Meta Cloud / simulação | Inbound WA → processInbound | ✅ |
| `/api/webhooks/instagram` | GET | Meta | Verificação | ✅ |
| `/api/webhooks/instagram` | POST | Meta IG / simulação | Inbound IG → processInbound | ✅ |
| `/api/webhooks/evolution` | GET | Evolution | Health | ✅ |
| `/api/webhooks/evolution` | POST | Evolution API | Inbound WA Baileys → processInbound | 🟡 requer Evolution |
| `/api/auth/[...nextauth]` | * | Auth.js | OAuth/credentials | ✅ |
| `/api/ai/follow-up` | GET | Vercel Cron | Follow-ups IA | 🟡 deploy |
| `/api/ai/stalled` | GET | Vercel Cron | Leads parados | 🟡 deploy |

**Resolução tenant:**

- Produção: `phone_number_id` (WA Meta), `pageId` (IG), `evolutionInstanceName` (Evolution)
- Dev: `?tenantId=UUID` permitido (`resolve-tenant.ts`)

**Idempotência:** `Message.externalId` unique por tenant.

**Filas:** Evolution usa `enqueueWebhookProcessing` + `ingestWebhook`. Meta WA/IG chamam `processInboundMessage` **síncrono** (sem ingest).

---

# 9. ANÁLISE DO MVP

**Definição MVP:** receber WhatsApp → IA interpreta → salvar lead → exibir no CRM.

| Item | Status |
|------|--------|
| Receber mensagem (simulada) | ✅ curl webhook |
| Receber mensagem (Evolution real) | 🔴 requer env + hospedagem |
| Criar lead (Contact) auto | ✅ |
| Criar conversa + mensagem | ✅ |
| IA interpreta (classify, intent, summary) | 🟡 async; Gemini se key |
| Exibir no CRM (Inbox) | ✅ |
| Criar oportunidade auto | 🔴 falta |
| Sem digitação manual | 🟡 parcial (só contato/conversa) |

## Crítico (bloqueia MVP demo hoje)

1. Ambiente dev estável (`dev:clean` / webpack; HD lento)
2. Gemini configurado (`GOOGLE_AI_API_KEY`)
3. Roteiro teste: webhook curl → inbox
4. Deixar claro na demo: simulação de canal, IA real

## Importante (MVP “completo” sem Evolution)

1. Wire `detectIntent` + `classifyLead` confiáveis com Gemini (testar)
2. Opcional: auto-criar Opportunity em `quote_request` / `interest` (código novo mínimo)
3. Respeitar `aiEnabled` (2–4h)

## Opcional (pós-MVP)

- Evolution produção
- OAuth Instagram
- Auto-reply outbound
- Upload arquivos
- Criptografia credentials Integration

---

# 10. RISCOS E GARGALOS

| Tipo | Item |
|------|------|
| **Arquitetura** | Dois caminhos WhatsApp (Meta vs Evolution) sem outbound Evolution |
| **Segurança** | Credentials Integration JSON sem criptografia aparente |
| **Segurança** | `?tenantId=` em dev — OK; bloqueado prod em resolve-tenant |
| **Escalabilidade** | processInbound síncrono Meta; IA fire-and-forget sem fila real |
| **Escalabilidade** | Rate limit in-memory (`lib/rate-limit.ts`) — não distribuído |
| **Confusão** | Docs (SDD/VISAO) prometem autonomia > código entrega |
| **Confusão** | aiEnabled UI vs backend ignorando |
| **DevEx** | Projeto em `/mnt/hd` + Turbopack → cache corrupto, 30–120s compile |
| **Código morto** | `lib/ai/index.ts` deprecated; providers/openai.ts pouco usado |
| **Mock silencioso** | Falha Gemini → mock sem alerta ao usuário |

---

# 11. MAPA GERAL DO SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js App Router)                             │
│  Landing · Auth · Dashboard · Inbox · CRM · Settings      │
└───────────────────────────┬─────────────────────────────────┘
                            │ apiFetch / Server Components
┌───────────────────────────▼─────────────────────────────────┐
│  API ROUTES (51 handlers) + proxy.ts (Auth)                 │
└───────┬─────────────────────────────┬───────────────────────┘
        │                             │
        ▼                             ▼
┌───────────────┐              ┌──────────────────┐
│  Prisma ORM   │              │  WEBHOOKS        │
│  PostgreSQL   │              │  /whatsapp       │
│               │◄─────────────│  /instagram      │
│  tenants      │  process     │  /evolution      │
│  contacts     │  Inbound     └────────┬─────────┘
│  conversations│                       │
│  messages     │                       │
│  integrations │              ┌────────▼─────────┐
│  ai_logs      │◄─────────────│  lib/webhooks/   │
└───────────────┘              │  process-inbound │
        ▲                      └────────┬─────────┘
        │                               │
        │                      ┌────────▼─────────┐
        │                      │  lib/ai/actions  │
        │                      │  + provider      │
        │                      │  (Gemini/Claude) │
        │                      └──────────────────┘
        │
┌───────┴────────┐     ┌─────────────────┐
│  lib/automations│     │  lib/channels/  │
│  engine         │     │  send (Meta)    │
└────────────────┘     └─────────────────┘
        ▲
        │ eventos: contact_created, conversation_created
┌───────┴────────┐
│  Evolution API │  (opcional — inbound only hoje)
│  Meta Graph    │  (webhook + outbound)
└────────────────┘
```

---

# 12. PRONTO PARA DEMONSTRAÇÃO (honesto)

## Pode mostrar a clientes

- CRM completo multi-empresa (contatos, funil, tarefas, faturamento)
- Inbox com histórico e ações IA (resumir, intenção, sugerir resposta)
- Hub integrações (fluxo visual QR + Instagram demo)
- Configuração agente Sara (instruções)
- Fluxo webhook simulado criando lead + conversa ao vivo (curl)
- IA real com Gemini (se key configurada)

## Ainda protótipo / demo

- Conexão WhatsApp real (QR celular)
- Instagram OAuth real
- Sara respondendo sozinha no WhatsApp
- Preenchimento automático de oportunidade
- Switch "Ativar IA" controlando backend

## Corrigir antes de entrega formal

- Dev server estável (cache .next)
- Testar webhook → inbox end-to-end uma vez
- Remover erros console conhecidos (Base UI buttons — já corrigido no hub)
- Documentar para cliente: "Fase 1 = simulação canal + IA real"

---

# 13. PLANO DE FINALIZAÇÃO MVP — HOJE

## Ordem de execução

### Bloco 1 — Estabilizar (30 min cada)

| # | Tarefa | Done quando |
|---|--------|-------------|
| 1.1 | `npm run dev:webpack` + limpar `.next` | Home abre < 60s após 1ª compilação |
| 1.2 | Confirmar `.env`: Gemini key + DATABASE_URL | `aiComplete` retorna gemini nos logs |
| 1.3 | Login ou seed + anotar `tenantId` | UUID copiado |

### Bloco 2 — Validar fluxo MVP core (30–45 min)

| # | Tarefa | Done quando |
|---|--------|-------------|
| 2.1 | curl webhook WhatsApp (GUIA §4.11) | 200 + contato/conversa criados |
| 2.2 | Abrir Inbox → ver mensagem | UI ok |
| 2.3 | Clicar Resumir + Detectar intenção + Sugerir resposta | Gemini responde (não mock) |
| 2.4 | Hub integrações: conectar WA + IG demo | Badges Conectado |

### Bloco 3 — Crítico se quiser "lead no funil" (1–2h) — OPCIONAL HOJE

| # | Tarefa | Impacto |
|---|--------|---------|
| 3.1 | Em `detectIntent`, se `quote_request` → criar Opportunity no stage "Novo Lead" | MVP mais próximo da visão |
| 3.2 | Gate `aiEnabled` em `processInboundMessage` antes do Promise.all IA | Switch honesto |

### Bloco 4 — Fechamento entrega (30 min)

| # | Tarefa |
|---|--------|
| 4.1 | Rodar checklist em `docs/ENTREGA-SEM-EVOLUTION.md` |
| 4.2 | Ensaiar roteiro 10 min: webhook → inbox → IA → pipeline |
| 4.3 | `npx tsc --noEmit` sem erros |

## O que NÃO fazer hoje

- Implementar Evolution produção
- OAuth Meta completo
- Auto-reply bot
- Refatorar arquitetura dual WhatsApp

---

*Fim da auditoria. Atualizar após cada item do plano for concluído.*
