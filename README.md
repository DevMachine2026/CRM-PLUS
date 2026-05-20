# CRM PLUS

> **Sistema Operacional Comercial Autônomo** — multi-tenant, IA nativa, WhatsApp & Instagram.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)](https://prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://typescriptlang.org)

---

## Documentação — por onde começar

| Você é… | Leia primeiro |
|---------|----------------|
| **Gestor / apresentação ao contratante** | **[VISAO-GERAL.md](./VISAO-GERAL.md)** — funcionalidades, fluxos, roteiro de demo |
| **Dono do produto / planejamento** | **[docs/ESTADO-DO-PROJETO-E-PLANO.md](./docs/ESTADO-DO-PROJETO-E-PLANO.md)** — estado real vs visão, lacunas, fases |
| **Validar sem Evolution API** | **[docs/ENTREGA-SEM-EVOLUTION.md](./docs/ENTREGA-SEM-EVOLUTION.md)** — demo, webhooks simulados, checklist |
| **WhatsApp produção (Evolution GO)** | **[docs/EVOLUTION-GO.md](./docs/EVOLUTION-GO.md)** — cliente GO, webhook, deploy Render |
| **Deploy tudo no Render** | **`render.yaml`** na raiz — Blueprint CRM + Postgres + crons |
| **Auditoria técnica / MVP** | **[docs/AUDITORIA-ARQUITETURA-MVP.md](./docs/AUDITORIA-ARQUITETURA-MVP.md)** — stack, fluxos, gaps, plano hoje |
| **Desenvolvedor / QA** | [GUIA-DE-TESTES.md](./GUIA-DE-TESTES.md) — validação módulo a módulo |
| **Arquiteto / produto técnico** | [SDD.md](./SDD.md) — design completo do sistema |

---

## O que é

O CRM PLUS não é um CRM onde o vendedor alimenta o sistema. **O sistema alimenta o vendedor.**

- Leads nascem automaticamente via webhook (WhatsApp / Instagram)
- IA classifica, resume e sugere ações — com agente configurável por empresa
- Automações disparam follow-ups e registram o que fizeram (timeline visível)
- Integrações Meta por tenant: tokens, webhook e badge **Conectado**
- O vendedor valida e fecha — o resto é automático

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| Banco | PostgreSQL via Supabase (Prisma 7) |
| Auth | Auth.js (NextAuth v5) |
| IA | Anthropic Claude / Google Gemini / Mock |
| Canais | WhatsApp Cloud API + Instagram Graph API |
| Deploy | Vercel (cron jobs nativos) |

---

## Funcionalidades (resumo)

| Módulo | Status |
|--------|--------|
| Auth (login, registro, roles) | ✅ |
| Contatos, Empresas, Produtos, Tags | ✅ |
| Pipeline Kanban (drag otimista, tags, inatividade) | ✅ |
| Oportunidades + itens de produto | ✅ |
| Faturamento (receitas automáticas) | ✅ |
| Inbox unificada (envio otimista, status de entrega) | ✅ |
| Painel de IA (resumo, intenção, sugestão) + agente configurável | ✅ |
| Automações (engine + timeline de logs + painel IA) | ✅ |
| Integrações Meta (UX + credenciais por tenant no runtime) | ✅ |
| Hardening multi-tenant (API + SSR + client) | ✅ |
| Webhooks (HMAC + idempotência + verify token por tenant) | ✅ |
| Cron jobs (stalled leads + follow-up) | ✅ |
| Provisionamento automático de tenant | ✅ |

Detalhes de cada módulo: **[VISAO-GERAL.md](./VISAO-GERAL.md)**.

---

## Setup Local

### 1. Pré-requisitos

- Node.js 20+
- PostgreSQL (ou projeto Supabase)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar `.env.local`

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
AUTH_SECRET="mesmo-valor-do-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
AI_PROVIDER="mock"
CRON_SECRET="dev-cron-secret-local"
```

Integrações Meta: opcional em dev (modo simulado) ou via **Settings → Integrações** após login.

### 4. Banco e servidor

```bash
npx prisma db push
npm run dev
```

Acesse `http://localhost:3000` → `/login` ou `/register`.

**Dev lento ou `ChunkLoadError` na primeira carga?** O projeto em `/mnt/hd` (disco montado via FUSE/NTFS) faz o Turbopack gravar milhares de arquivos em `.next` de forma lenta; às vezes o chunk fica incompleto e a primeira requisição retorna 500. Soluções (da mais estável à paliativa):

1. Clonar/copiar o repo para disco local ext4 (ex.: `~/CRM-PLUS`) e rodar `npm run dev` de lá.
2. `npm run dev:webpack` — Webpack costuma ser mais estável nesse tipo de montagem.
3. `npm run dev:clean` — apaga `.next` e sobe de novo (pare o servidor antes, se já estiver rodando).

Na segunda visita à mesma rota, após o cache esquentar, costuma responder em ~300 ms.

---

## Primeiro Acesso

1. `http://localhost:3000/register` — cria empresa + owner  
2. Provisionamento automático: pipeline (5 etapas), 5 tags, 3 automações  
3. **Settings → Integrações** — WhatsApp/Instagram (produção)  
4. **Settings → Agente de IA** — personalizar prompt e testar antes de salvar  

---

## Integrações Meta

| Canal | Campos |
|-------|--------|
| WhatsApp | Phone Number ID · Access Token · Verify Token |
| Instagram | Page ID · Access Token · Verify Token |

Webhook (copiar na tela):

```
https://seu-dominio.com/api/webhooks/whatsapp
https://seu-dominio.com/api/webhooks/instagram
```

Credenciais salvas na UI são usadas para **envio**, **roteamento inbound** e **verificação GET** do webhook.

---

## Arquitetura (resumo)

| Camada | Local |
|--------|--------|
| UI | `app/(dashboard)/*`, `components/` |
| APIs | `app/api/*` |
| IA | `lib/ai/provider.ts`, `lib/ai/tenant-prompt.ts`, `lib/ai/actions/*` |
| Automações | `lib/automations/engine.ts`, `emit.ts`, `log-timeline.ts` |
| Integrações | `lib/integrations/credentials.ts`, `verify-webhook-token.ts` |
| Webhooks | `lib/webhooks/process-inbound.ts` |
| Setup tenant | `lib/tenant/setup.ts` |

---

*Última atualização: 2026-05-18 | CRM PLUS v1.0.3*
