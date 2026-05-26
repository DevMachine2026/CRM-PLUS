# Handoff Instagram / Meta — CRM PLUS

Documento para **você** (desenvolvedor) e para **enviar ao contratante** que administra o app na Meta.

---

## O que pedir ao contratante

Peça por canal seguro (não WhatsApp público) apenas:

| Item | Onde o contratante acha |
|------|-------------------------|
| **App ID** (`META_APP_ID`) | [developers.facebook.com](https://developers.facebook.com) → App → **Configurações** → **Básico** → *ID do aplicativo* |
| **App Secret** (`META_APP_SECRET`) | Mesma tela → *Chave secreta do aplicativo* → **Mostrar** |

Opcional se for diferente do App Secret:

| Item | Uso |
|------|-----|
| **INSTAGRAM_WEBHOOK_SECRET** | Validação HMAC do webhook; em geral **igual ao App Secret** |

**Não peça** token de usuário, senha do Facebook nem acesso à conta pessoal — o dono da página faz o login no botão *Continuar com Facebook* dentro do CRM.

---

## O que o contratante configura no painel Meta (uma vez)

Substitua `https://SEU-CRM` pela URL real (`NEXTAUTH_URL`).

### 1. Redirect OAuth (Facebook Login)

**Facebook Login** → **Configurações** → **URIs de redirecionamento OAuth válidos**:

```
https://SEU-CRM/api/integrations/instagram/oauth/callback
```

Desenvolvimento local (se testarem em máquina):

```
http://localhost:3000/api/integrations/instagram/oauth/callback
```

### 2. Webhook Instagram

**Instagram** ou **Messenger** → **Webhooks**:

| Campo | Valor |
|-------|--------|
| **URL de retorno** | `https://SEU-CRM/api/webhooks/instagram` |
| **Verify token** | Gerado automaticamente ao conectar a página no CRM (modo avançado) ou definido na integração |

Campos inscritos sugeridos: `messages`, `messaging_postbacks`, `message_reactions`.

### 3. Permissões do app

O login do CRM solicita:

- `pages_show_list`
- `pages_messaging`
- `instagram_basic`
- `instagram_manage_messages`

Em modo **Desenvolvimento**, adicionar usuários de teste em **Funções** → **Testadores**.

### 4. Conta Instagram do cliente

- Instagram **Profissional** (Business ou Creator)
- Vinculado a uma **Página do Facebook**
- Usuário que conecta no CRM deve ser **admin** da Página

---

## O que você faz ao receber as credenciais

1. Abra `.env.meta.template` na raiz do projeto.
2. Copie as variáveis preenchidas para `.env.local` (dev) e para **Vercel → Environment Variables** (prod).
3. Confirme `NEXTAUTH_URL` com a URL pública correta.
4. Execute:

```bash
npm run check:meta
```

5. Reinicie `npm run dev` ou faça redeploy.
6. No CRM: **Configurações → Integrações** — o painel amarelo deve sumir (itens OK).
7. **Instagram → Continuar com Facebook** → escolher a página → **Conectar**.

---

## Modelo de mensagem para o contratante

Copie e ajuste:

```
Olá!

Para integrar o Instagram Direct ao CRM, precisamos que criem (ou nos passem) um App em 
https://developers.facebook.com com os produtos Instagram / Messenger.

Por favor nos enviem com segurança:
1) ID do aplicativo (App ID)
2) Chave secreta do aplicativo (App Secret)

No app Meta, cadastrem também:
• Redirect OAuth: https://[URL-DO-CRM]/api/integrations/instagram/oauth/callback
• Webhook: https://[URL-DO-CRM]/api/webhooks/instagram

A conta Instagram deve ser profissional e vinculada à Página do Facebook.
Quem for conectar no CRM precisa ser administrador dessa Página.

Depois disso, fazemos o login pelo botão "Continuar com Facebook" no painel de Integrações.
```

---

## Checklist rápido

- [ ] `META_APP_ID` e `META_APP_SECRET` no servidor
- [ ] `NEXTAUTH_URL` = URL pública do CRM
- [ ] Redirect URI cadastrado no app Meta
- [ ] Webhook URL cadastrado no app Meta
- [ ] `INSTAGRAM_WEBHOOK_SECRET` (prod, se `WEBHOOK_SIGNATURE_REQUIRED=true`)
- [ ] Login Facebook no CRM e página conectada
- [ ] DM de teste aparece na Inbox

---

## Referência no código

| Peça | Caminho |
|------|---------|
| OAuth start | `app/api/integrations/instagram/oauth/start/route.ts` |
| OAuth callback | `app/api/integrations/instagram/oauth/callback/route.ts` |
| Conectar página | `app/api/integrations/instagram/connect/route.ts` |
| Webhook | `app/api/webhooks/instagram/route.ts` |
| Checklist UI | `components/integrations/meta-instagram-readiness-panel.tsx` |
