# Deploy — Neon + Vercel + Render (Evolution GO)

Stack alvo de custo-benefício para o CRM PLUS.

| Camada | Plataforma | Papel |
|--------|------------|--------|
| Postgres (CRM) | **Neon** | `DATABASE_URL` — multitenancy, Prisma |
| Aplicação Next.js | **Vercel** | UI, API routes, auth, webhooks, crons |
| WhatsApp | **Render** | **Evolution GO** (Docker) + Postgres do GO (se ainda no Render) |

Não manter CRM nem `crm-plus-db` no Render após a Vercel estar no ar.

---

## 1. Neon (banco do CRM) — feito

- [x] Projeto Neon (ex.: São Paulo)
- [x] `DATABASE_URL` com `sslmode=require` (pooler ok)
- [x] `npx prisma db push` (schema sincronizado)
- [x] `npm run db:seed` (opcional, só primeira vez)

**Produção:** não rodar `db:seed` em todo deploy.

---

## 2. Vercel (CRM PLUS)

### Importar projeto

1. [vercel.com](https://vercel.com) → Add Project → repo `CRM-PLUS`
2. Framework: **Next.js** (detectado)
3. Região: **gru1** (já em `vercel.json`)

### Variáveis de ambiente (Production)

```env
DATABASE_URL=              # Neon (URI completa)
NEXTAUTH_URL=              # https://seu-app.vercel.app
NEXTAUTH_SECRET=           # openssl rand -base64 32
AUTH_SECRET=               # mesmo valor que NEXTAUTH_SECRET
AI_PROVIDER=gemini
GOOGLE_AI_API_KEY=
CRON_SECRET=               # openssl rand -base64 32 — Vercel Cron usa automaticamente
EVOLUTION_API_URL=         # https://evolution-go.onrender.com
EVOLUTION_API_KEY=         # = GLOBAL_API_KEY no Evolution GO
```

### Build

O `vercel.json` usa `npm run build` → `prisma generate && next build`.

Schema já no Neon via `db push` / `migrate deploy` manual. Em mudanças de schema futuras, rodar migration antes ou adicionar `prisma migrate deploy` ao build.

### Crons (substituem Render crons)

Definidos em `vercel.json` (compatível com **Vercel Hobby** — só 1x/dia por cron):

- `GET /api/ai/follow-up` — diário 09:00 UTC
- `GET /api/ai/stalled` — diário 08:00 UTC

**Hobby não permite** `0 * * * *` (a cada hora). Para follow-up **horário**, use Vercel **Pro** ou cron externo (`curl` + `CRON_SECRET`) apontando para a URL da Vercel.

### Após deploy

- [ ] Login `/login` ok
- [ ] `/api/health` ok
- [ ] Inbox e contatos carregam (Neon)

---

## 3. Render — só Evolution GO

### Manter

- [ ] Web Service **evolution-go** (Docker)
- [ ] Postgres do GO (`evogo_auth`, `evogo_users`) se já existir — ver `docs/EVOLUTION-GO.md`

### Atualizar no CRM (Vercel env)

```env
EVOLUTION_API_URL=https://<evolution-go>.onrender.com
EVOLUTION_API_KEY=<GLOBAL_API_KEY do GO>
NEXTAUTH_URL=https://<crm>.vercel.app
```

### Webhook Evolution → CRM

O GO registra em connect:

```text
{NEXTAUTH_URL}/api/webhooks/evolution
```

Após mudar `NEXTAUTH_URL` para Vercel, **reconectar** WhatsApp (nova sessão QR) ou atualizar webhook na instância GO.

---

## 4. Desligar no Render (economia)

Após Vercel **Live** e testes básicos:

| Recurso | Ação |
|---------|------|
| **crm-plus-db** | Suspend → Delete (CRM usa Neon) |
| **CRM-PLUS** (Web Node) | Suspend → Delete |
| **crm-follow-up** / **crm-stalled** (cron) | Delete se existirem |
| **evolution-go** | **Manter** |

---

## 5. Checklist de integração WhatsApp

- [ ] `EVOLUTION_API_URL` + `EVOLUTION_API_KEY` na Vercel
- [ ] `NEXTAUTH_URL` = domínio Vercel (sem barra final)
- [ ] Hub → Conectar WhatsApp → QR → `connected`
- [ ] Mensagem inbound aparece no Inbox
- [ ] Resposta outbound envia via GO

---

## Diagrama

```text
Cliente WhatsApp
       ↓
Evolution GO (Render Docker)
       ↓ webhook
CRM PLUS (Vercel) ──Prisma──► Neon Postgres
```

---

*Atualizado: 2026-05-25*
