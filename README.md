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
| Engine de Automações | ✅ Completo |
| Webhooks WhatsApp + Instagram (HMAC) | ✅ Completo |
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

## Arquitetura

Veja o [SDD.md](./SDD.md) para o documento de design completo.

---

*Última atualização: 2026-05-18 | CRM PLUS v1.0.0*
