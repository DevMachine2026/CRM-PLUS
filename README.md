# CRM PLUS

> **Sistema Operacional Comercial Autônomo** — multi-tenant, IA nativa, WhatsApp & Instagram.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)](https://prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://typescriptlang.org)

---

## O que é

O CRM PLUS não é um CRM onde o vendedor alimenta o sistema. **O sistema alimenta o vendedor.**

- Leads nascem automaticamente via webhook (WhatsApp / Instagram)
- IA classifica, resume e sugere ações sem intervenção manual
- Automações disparam follow-ups por inatividade
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

## Funcionalidades

| Módulo | Status |
|--------|--------|
| Auth (login, registro, roles) | ✅ Completo |
| Contatos, Empresas, Produtos, Tags | ✅ Completo |
| Pipeline Kanban com drag & drop | ✅ Completo |
| Oportunidades + itens de produto | ✅ Completo |
| Faturamento (receitas automáticas) | ✅ Completo |
| Inbox unificada (WA + IG + email) | ✅ Completo |
| Painel de IA (resumo, intenção, sugestão) | ✅ Completo |
| Engine de Automações (triggers conectados) | ✅ Completo |
| Hardening multi-tenant (API + SSR + client) | ✅ Completo |
| Webhooks WhatsApp + Instagram (HMAC + idempotência) | ✅ Completo |
| Cron jobs (stalled leads + follow-up) | ✅ Completo |
| Provisionamento automático de tenant | ✅ Completo |
| Settings > Integrações (save de credenciais) | ✅ Completo |

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
# Banco
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Auth
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
AUTH_SECRET="mesmo-valor-do-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# IA (opcional — usa mock sem chave)
AI_PROVIDER="mock"
# AI_PROVIDER="anthropic"
# ANTHROPIC_API_KEY="sk-ant-..."

# Cron Jobs
CRON_SECRET="dev-cron-secret-local"

# WhatsApp (opcional para dev)
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_WEBHOOK_VERIFY_TOKEN=""

# Instagram (opcional para dev)
INSTAGRAM_ACCESS_TOKEN=""
INSTAGRAM_PAGE_ID=""
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=""
```

### 4. Aplicar schema no banco

```bash
npx prisma db push
```

### 5. Rodar o servidor

```bash
npm run dev
```

Acesse `http://localhost:3000` — redireciona para `/login`.

---

## Primeiro Acesso

1. Vá em `http://localhost:3000/register`
2. Crie sua empresa — são gerados automaticamente:
   - Pipeline principal (5 etapas)
   - 5 tags padrão
   - 3 automações de IA ativas

---

## Configurar Integrações (WhatsApp / Instagram)

Acesse **Settings → Integrações** e preencha:

| Canal | Campos necessários |
|-------|--------------------|
| WhatsApp | Phone Number ID · Access Token · Verify Token |
| Instagram | Page ID · Access Token · Verify Token |

Obtidos em [developers.facebook.com](https://developers.facebook.com/apps) → seu App → WhatsApp/Instagram.

A webhook URL para configurar no Meta:
```
https://seu-dominio.com/api/webhooks/whatsapp
https://seu-dominio.com/api/webhooks/instagram
```

---

## Variáveis de Produção (Vercel)

```env
DATABASE_URL=...
NEXTAUTH_SECRET=...
AUTH_SECRET=...
NEXTAUTH_URL=https://seu-dominio.com
CRON_SECRET=<openssl rand -base64 32>
WEBHOOK_SECRET_WHATSAPP=<app_secret_do_meta>
WEBHOOK_SECRET_INSTAGRAM=<app_secret_do_meta>
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Testes

Veja o [GUIA-DE-TESTES.md](./GUIA-DE-TESTES.md) para o fluxo completo de validação.

---

## Arquitetura (resumo)

| Camada | Local |
|--------|--------|
| UI | `app/(dashboard)/*`, `components/` |
| APIs REST | `app/api/*` |
| Auth (edge) | `proxy.ts` + `lib/auth/auth.config.ts` |
| Auth (Node) | `lib/auth/auth.ts` |
| IA | `lib/ai/provider.ts` + `lib/ai/actions/*` |
| Automações | `lib/automations/engine.ts` + `lib/automations/emit.ts` |
| Webhooks inbound | `lib/webhooks/process-inbound.ts` |
| Provisionamento tenant | `lib/tenant/setup.ts` |

### Motor de automações

O engine (`runAutomations`) é disparado via `lib/automations/emit.ts` nos eventos:

- `contact_created` / `contact_status_changed`
- `conversation_created`
- `opportunity_created` / `opportunity_status_changed` / `opportunity_stage_changed`
- `task_created`
- `revenue_status_changed`

Cada tenant novo recebe 3 automações padrão ativas (provisionadas em `lib/tenant/setup.ts`). Logs em `automation_logs` — visíveis em **Automações**.

### Webhooks e idempotência

Mensagens inbound (WhatsApp `wamid` / Instagram `mid`) gravam `messages.external_id`. Duplicatas com o mesmo ID no mesmo tenant são ignoradas (`UNIQUE(tenant_id, external_id)`).

### Segurança multi-tenant (v1.0.2)

| Camada | Implementação |
|--------|----------------|
| APIs | `tenantWhere(session, id)` em PATCH/DELETE; `tenantId` só da sessão |
| SSR | `requirePageSession()` + `requirePagePermission()` em todas as páginas do dashboard |
| Cliente | `apiFetch()` em `lib/api/client-fetch.ts` — redirect em 401/403 |
| Webhooks | Produção: tenant por credencial de integração; dev: `?tenantId` com UUID válido |
| Demo | `POST /api/demo/seed` retorna 404 em produção |

UX: banners em `/login` e no dashboard quando `?reason=session_expired` ou `?reason=forbidden`.

Documento completo: [SDD.md](./SDD.md) · Testes: [GUIA-DE-TESTES.md](./GUIA-DE-TESTES.md)

---

*Última atualização: 2026-05-18 | CRM PLUS v1.0.2*
