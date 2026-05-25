# CRM PLUS

> **Sistema Operacional Comercial Autônomo** — multi-tenant, IA nativa, conversas WhatsApp e Instagram alimentando o CRM.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)](https://prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://typescriptlang.org)

---

## Panorama executivo (leia isto para montar seu plano)

### Visão do produto

O CRM PLUS não é um CRM onde o vendedor alimenta o sistema. **O sistema alimenta o vendedor:**

1. Mensagem chega no **WhatsApp** ou **Instagram**
2. Webhook grava **contato**, **conversa** e **mensagem** no Inbox
3. Com **IA ligada**, classifica lead (contato novo), resume, detecta intenção e pode criar **tarefas**
4. Vendedor valida no Inbox / Pipeline e fecha negócio

### Onde estamos hoje (maio/2026)

| Camada | Situação | Nota |
|--------|----------|------|
| **CRM core** (contatos, empresas, pipeline, oportunidades, tarefas, faturamento) | ✅ Pronto | Multi-tenant, permissões, UI polida |
| **Inbox omnichannel** | ✅ Pronto | Lista, thread, envio, status de entrega |
| **WhatsApp real (QR)** | ✅ Piloto | [Evolution GO](docs/EVOLUTION-GO.md) — webhook, ingest 1:1, resposta via GO |
| **WhatsApp Meta Cloud** | 🟡 Alternativa | Tokens manuais em modo avançado; mesmo motor de ingest |
| **Instagram** | 🟡 Parcial | Mesmo `processInboundMessage`; **conexão UI ainda demo** (OAuth Meta pendente) |
| **IA assistiva** | ✅ | Gemini / Claude / mock; resumo, intenção, sugestão de resposta na UI |
| **IA no webhook** | ✅ se `aiEnabled` | Classificar lead, resumir, intenção, tarefas automáticas |
| **IA autônoma (bot responde sozinho)** | 🔴 Não | Só sugere texto; humano envia |
| **Funil automático (opp. da conversa)** | 🔴 Não | Oportunidade **não** nasce sozinha no webhook |
| **Deploy produção** | ✅ Neon + Vercel + Render (GO) | Ver [docs/DEPLOY-NEON-VERCEL-RENDER.md](./docs/DEPLOY-NEON-VERCEL-RENDER.md) |

**Resumo em uma frase:** você tem um **CRM completo com Inbox e IA assistiva**; o **WhatsApp via QR em produção** está no caminho certo; falta fechar **Instagram real**, **autonomia de funil** e, se desejado, **resposta automática da Sara**.

### Fluxo técnico (como as peças se ligam)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ CANAIS                                                                    │
│  WhatsApp: Evolution GO (QR)  OU  Meta Cloud API (Phone Number ID)       │
│  Instagram: Meta Graph (webhook) — requer app Meta + página conectada      │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTPS
        POST /api/webhooks/evolution     POST /api/webhooks/whatsapp
        POST /api/webhooks/instagram
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ CRM — lib/webhooks/process-inbound.ts                                     │
│  → Contact (criar/atualizar)                                              │
│  → Conversation + Message (inbound; fromMe = outbound em 1:1 WA)        │
│  → emit contact_created / conversation_created (automações)             │
│  → se aiEnabled: classifyLead (novo), summarize, detectIntent (+ task)   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ UI — /inbox, /contacts, /pipeline, /opportunities, /automations           │
│ Resposta: lib/channels/send-message.ts → Evolution GO ou Meta Graph       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Webhook WhatsApp (Evolution GO):** `{NEXTAUTH_URL}/api/webhooks/evolution`  
**Webhook Meta:** `{NEXTAUTH_URL}/api/webhooks/whatsapp` e `/api/webhooks/instagram`

### O que “preenche o CRM” hoje vs. o que ainda falta

| Dado / ação | WhatsApp (GO) | Instagram | Automático? |
|-------------|---------------|-----------|-------------|
| Contato (telefone / PSID) | ✅ | ✅ (webhook) | Sim |
| Conversa + mensagens no Inbox | ✅ 1:1* | ✅ (com Meta real) | Sim |
| `leadScore` + tags no contato | ✅ | ✅ | Sim, contato **novo** + IA on |
| Tarefa (reclamação, orçamento, etc.) | ✅ | ✅ | Sim, intenção forte |
| Automação `contact_created` | ✅ | ✅ | Sim |
| **Oportunidade** no pipeline | — | — | **Não** |
| Status do contato (lead/cliente) pela IA | — | — | **Não** (só sugestão interna) |
| Empresa criada a partir do chat | — | — | **Não** |
| Resposta automática no canal | — | — | **Não** |

\* Grupos WhatsApp: **desligados por padrão**. Não defina `WHATSAPP_INGEST_GROUPS` no Render (só 1:1 no Inbox).

---

## Plano de ação recomendado (para concluir o projeto)

Use esta ordem ou repriorize conforme o contratante.

### Fase 0 — Estabilizar operação (0,5–1 dia)

| # | Ação | Critério de pronto |
|---|------|-------------------|
| 0.1 | Confirmar deploy CRM com últimos commits (`webhook`, QR async, sem rate limit) | Mensagem 1:1 aparece no Inbox em &lt; 30s |
| 0.2 | Render: `NEXTAUTH_URL`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` alinhados | Lifecycle `connected` no log Evolution |
| 0.3 | **Não** setar `WHATSAPP_INGEST_GROUPS` | Só DMs no Inbox |
| 0.4 | Crons: `CRON_SECRET` + jobs em `render.yaml` | Follow-up / stalled leads rodam |
| 0.5 | Dev local: SSD ou `npm run dev:webpack` se `/mnt/hd` lento | Sem `ChunkLoadError` na demo |

### Fase 1 — WhatsApp produção confiável (1–2 dias)

| # | Ação | Critério de pronto |
|---|------|-------------------|
| 1.1 | Evolution GO estável (RAM/plano Render; evitar OOM no free tier) | Instância não cai no sync |
| 1.2 | Teste E2E: DM externo → Inbox → responder → chega no celular | `externalStatus` ok |
| 1.3 | Documentar número conectado por tenant | Integrações mostra `connected` + telefone |
| 1.4 | Limpar conversas demo/grupo antigas no banco (opcional) | Inbox só clientes reais |

**Docs:** [docs/EVOLUTION-GO.md](./docs/EVOLUTION-GO.md) · [docs/EVOLUTION-GO-CONNECT.md](./docs/EVOLUTION-GO-CONNECT.md)

### Fase 2 — Instagram real (2–4 dias)

| # | Ação | Critério de pronto |
|---|------|-------------------|
| 2.1 | App Meta (Instagram Messaging / página) | App ID + secret no env |
| 2.2 | OAuth no botão “Continuar com Facebook” (`instagram-connect-sheet`) | Lista páginas **reais** |
| 2.3 | Webhook Meta → URL produção + `verify_token` por tenant | GET verify 200 |
| 2.4 | `pageId` salvo na integração = `recipient.id` do webhook | DM aparece no Inbox |
| 2.5 | Envio outbound com token de página real | Resposta na DM Instagram |

**Hoje:** `GET/POST /api/integrations/instagram/connect` usa **páginas demo** e token sintético.

### Fase 3 — CRM “enche sozinho” do funil (3–5 dias)

| # | Ação | Critério de pronto |
|---|------|-------------------|
| 3.1 | Criar **oportunidade** quando `detectIntent` = `interest` / `quote_request` (regras configuráveis) | Opp. no estágio inicial sem clique manual |
| 3.2 | Aplicar `suggestedStatus` do `classifyLead` no contato (opcional / confirmação) | Status atualizado + log |
| 3.3 | `suggestNextAction` também quando **não** há opp. aberta | Próximo passo visível na inbox |
| 3.4 | Automações: `conversation_created` com ações úteis | Timeline em Automações |

### Fase 4 — IA autônoma controlada (3–5 dias, se exigido pelo produto)

| # | Ação | Critério de pronto |
|---|------|-------------------|
| 4.1 | Auto-reply outbound quando `aiEnabled` + confiança + horário | Mensagem sai sem humano |
| 4.2 | “Assumir conversa” / pausar bot na Inbox | Flag por conversa |
| 4.3 | Métricas: IA agiu vs. vendedor assumiu | Dashboard ou logs |

**Hoje:** `aiEnabled` já **liga/desliga** pipeline no webhook (`process-inbound.ts`).

### Fase 5 — Polimento e entrega (contínuo)

| # | Ação |
|---|------|
| 5.1 | Mídia (imagem/áudio) — download + anexo ou preview |
| 5.2 | Badge “Conversas” na sidebar = contagem real |
| 5.3 | Atualizar [docs/ESTADO-DO-PROJETO-E-PLANO.md](./docs/ESTADO-DO-PROJETO-E-PLANO.md) a cada fase concluída |
| 5.4 | Roteiro demo 15 min: [VISAO-GERAL.md](./VISAO-GERAL.md) + [GUIA-DE-TESTES.md](./GUIA-DE-TESTES.md) |

### Checklist “visão original atendida”

- [ ] WhatsApp sem copiar Phone Number ID (QR Evolution) — **feito em piloto**
- [ ] Instagram com login social + página real — **pendente (Fase 2)**
- [ ] Webhook automático por empresa (`tenant_id`) — **feito (Evolution connect)**
- [ ] Sara configurável (instruções + tom) — **feito**
- [ ] IA desligada = só grava mensagem, sem análise — **feito (`aiEnabled`)**
- [ ] IA ligada = classifica + resume + intenção + tarefas — **feito**
- [ ] Sara responde sozinha no canal — **pendente (Fase 4)**
- [ ] Oportunidade nasce da conversa — **pendente (Fase 3)**
- [ ] Inbox único WhatsApp + Instagram — **feito (com IG real na Fase 2)**

---

## Documentação — por onde começar

| Você é… | Leia primeiro |
|---------|----------------|
| **Plano de ação / status do projeto** | **Este README** (seções acima) + [docs/ESTADO-DO-PROJETO-E-PLANO.md](./docs/ESTADO-DO-PROJETO-E-PLANO.md) |
| **Gestor / demo ao contratante** | [VISAO-GERAL.md](./VISAO-GERAL.md) |
| **WhatsApp produção (Evolution GO)** | [docs/EVOLUTION-GO.md](./docs/EVOLUTION-GO.md) · [docs/EVOLUTION-GO-CONNECT.md](./docs/EVOLUTION-GO-CONNECT.md) |
| **Validar sem servidor Evolution** | [docs/ENTREGA-SEM-EVOLUTION.md](./docs/ENTREGA-SEM-EVOLUTION.md) |
| **Auditoria técnica / gaps** | [docs/AUDITORIA-ARQUITETURA-MVP.md](./docs/AUDITORIA-ARQUITETURA-MVP.md) |
| **QA módulo a módulo** | [GUIA-DE-TESTES.md](./GUIA-DE-TESTES.md) |
| **Especificação completa** | [SDD.md](./SDD.md) |
| **Deploy stack (Neon + Vercel + Render GO)** | [docs/DEPLOY-NEON-VERCEL-RENDER.md](./docs/DEPLOY-NEON-VERCEL-RENDER.md) · legado: `render.yaml` |

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| Banco | PostgreSQL (Prisma 7) — Supabase / Neon / Render Postgres |
| Auth | Auth.js (NextAuth v5) |
| IA | Google Gemini · Anthropic Claude · Mock |
| WhatsApp (piloto) | **Evolution GO** (QR, Baileys) |
| WhatsApp / Instagram (oficial) | Meta Graph API (modo avançado + webhooks) |
| Deploy | **Render** (`render.yaml`) — Vercel também suportado para crons |

---

## Módulos — matriz de status

| Módulo | Status | Observação |
|--------|--------|------------|
| Auth (login, registro, roles) | ✅ | |
| Contatos, Empresas, Produtos, Tags | ✅ | |
| Pipeline Kanban | ✅ | Drag otimista, tags, inatividade |
| Oportunidades + itens + faturamento | ✅ | Criação manual; **não** auto via chat |
| Inbox unificada | ✅ | Envio via Evolution GO ou Meta conforme rota |
| Painel de IA na conversa | ✅ | Resumo, intenção, sugerir resposta |
| Agente configurável (Sara) | ✅ | `settings.ai` + prompt por tenant |
| Automações + timeline de logs | ✅ | `contact_created` dispara no webhook |
| Integrações hub (QR + IG sheet) | 🟡 | WA real com env; IG demo |
| Webhooks + idempotência | ✅ | Evolution + Meta |
| Cron (stalled + follow-up) | ✅ | Requer `CRON_SECRET` em produção |
| Provisionamento de tenant | ✅ | Pipeline, tags, automações padrão |

---

## Produção (referência Render)

| Serviço | Papel |
|---------|--------|
| **CRM** (`crm-plus-xeps` ou seu app) | Next.js, Postgres, webhooks, UI |
| **Evolution GO** | Instância WhatsApp por tenant, QR, envio |
| **Postgres** | CRM + (separado) bancos `evogo_auth` / `evogo_users` no GO |

Variáveis críticas no **CRM**:

```env
DATABASE_URL=...
NEXTAUTH_URL=https://seu-crm.onrender.com
NEXTAUTH_SECRET=...
AUTH_SECRET=...          # mesmo valor
EVOLUTION_API_URL=https://seu-evolution-go.onrender.com
EVOLUTION_API_KEY=...    # = GLOBAL_API_KEY no GO
AI_PROVIDER=gemini|claude|mock
GOOGLE_AI_API_KEY=...    # ou ANTHROPIC_API_KEY
CRON_SECRET=...
# NÃO definir WHATSAPP_INGEST_GROUPS (só 1:1)
```

---

## Setup local

### Pré-requisitos

- Node.js 20+
- PostgreSQL local ou URL remota (Neon/Supabase)

### Comandos

```bash
npm install
cp .env.local.example .env.local   # editar DATABASE_URL e secrets
npx prisma db push
npm run dev
```

Acesse `http://localhost:3000` → `/register` ou `/login`.

**Dev lento em `/mnt/hd`?** Use disco local ext4, ou `npm run dev:webpack`, ou `npm run dev:clean`.

### `.env.local` mínimo

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
AUTH_SECRET="mesmo-valor"
NEXTAUTH_URL="http://localhost:3000"
AI_PROVIDER="mock"
CRON_SECRET="dev-cron-secret-local"
# Opcional Evolution (sem URL = modo demo WhatsApp):
# EVOLUTION_API_URL="http://localhost:8080"
# EVOLUTION_API_KEY="..."
```

Ver [.env.local.example](./.env.local.example) para Meta, Evolution e flags.

---

## Primeiro acesso

1. `/register` — cria empresa + owner  
2. Provisionamento: pipeline (5 etapas), tags, automações padrão  
3. **Configurações → Integrações** — WhatsApp (QR) / Instagram  
4. **Configurações → Agente de IA** — persona, tom, `aiEnabled`  
5. **Inbox** — validar mensagem de teste (webhook simulado ou Evolution real)

---

## Integrações — três caminhos

| Caminho | Conexão | Webhook inbound | Envio |
|---------|---------|-----------------|-------|
| **Evolution GO (recomendado piloto)** | QR em Integrações | `/api/webhooks/evolution` | `evolution-go-send.ts` |
| **Meta WhatsApp Cloud** | Tokens em modo avançado | `/api/webhooks/whatsapp` | Graph API |
| **Instagram** | OAuth + página (pendente UI) | `/api/webhooks/instagram` | Graph API |

Credenciais por tenant: tabela `integrations` (`credentials` JSON + `webhookUrl`).

---

## Arquitetura — arquivos-chave

| Área | Caminho |
|------|---------|
| UI dashboard | `app/(dashboard)/*`, `components/` |
| APIs | `app/api/*` |
| Inbound único | `lib/webhooks/process-inbound.ts` |
| Parser Evolution | `lib/webhooks/parse-evolution-go-payload.ts` |
| Política grupos WA | `lib/integrations/whatsapp-ingest-policy.ts` |
| Envio canais | `lib/channels/send-message.ts` |
| Evolution cliente | `lib/integrations/evolution-go-client.ts` |
| IA | `lib/ai/provider.ts`, `lib/ai/actions/*` |
| Automações | `lib/automations/engine.ts`, `emit.ts` |
| Setup tenant | `lib/tenant/setup.ts` |

---

## Testes rápidos pós-deploy WhatsApp

1. Conectar QR em **Integrações** → estado `connected` + telefone.  
2. Enviar DM **1:1** de outro número → conversa no **Inbox**.  
3. **Contatos** → novo registro com telefone correto.  
4. Com IA ligada: `leadScore` em contato novo; tarefa em mensagem “quero orçamento”.  
5. Responder no Inbox → mensagem no WhatsApp do cliente.  
6. **Automações** → log `contact_created` após primeiro contato.

Detalhe: [GUIA-DE-TESTES.md](./GUIA-DE-TESTES.md).

---

## Decisões de produto (definem o próximo sprint)

1. **WhatsApp oficial:** manter **Evolution GO** no piloto ou migrar para **Meta Cloud**?  
2. **Instagram:** prioridade Fase 2 antes de funil automático?  
3. **Autonomia v1:** Sara **só sugere** (atual) ou **responde sozinha** (Fase 4)?  
4. **Funil:** oportunidade automática em quais intenções / estágio inicial?  
5. **Ambiente dev:** mover repo para SSD local?

---

## Comandos úteis

```bash
npm run dev              # Turbopack
npm run dev:webpack      # mais estável em HD lento
npm run dev:clean        # limpa .next
npm run build            # produção
npm run db:seed          # dados demo
npx tsc --noEmit         # checagem TypeScript
```

---

*Última atualização: 2026-05-18 — README alinhado ao piloto Evolution GO em produção e gaps Instagram / funil / IA autônoma.*
