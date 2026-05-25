# Conexão WhatsApp — Evolution GO (guia profissional)

Arquitetura escalável para CRM PLUS e outros projetos que usam o mesmo padrão.

## Princípios

1. **Sem link externo** — QR e código gerados na própria UI do CRM.
2. **Dois métodos** — QR (recomendado; número = aparelho que escaneia) e código no celular (alternativa).
3. **Uma instância por tenant** — nome estável `crmplus-<tenantId>`.
4. **Auth correta** — `GLOBAL_API_KEY` só em rotas admin (`/instance/create`); demais rotas usam **token da instância**.
5. **Webhook automático** — `POST /instance/connect` registra `{NEXTAUTH_URL}/api/webhooks/evolution`.

## Camadas no código

```
components/integrations/whatsapp-connect-sheet.tsx   → UI (escolha método + polling)
app/api/integrations/whatsapp/session/route.ts       → API CRM (auth + persistência)
lib/integrations/evolution-go/session.ts             → orquestração (create → connect → pair/qr)
lib/integrations/evolution-go-client.ts              → HTTP Evolution GO
lib/integrations/evolution-go/phone.ts               → normalização E.164 BR
```

## Método recomendado: QR Code

O número conectado **não é digitado no CRM** — vem do `myJid` do Evolution GO após o celular
escanear o QR (aparelho que leu o código).

## Método alternativo: código no celular (pairing)

**Fluxo:**

1. Usuário informa número (só para gerar o código de 8 dígitos).
2. CRM cria instância + `connect` + `POST /instance/pair`.
3. UI exibe **8 dígitos**.
4. No celular: WhatsApp → Aparelhos conectados → Conectar com número → digitar código.
5. Polling `GET /session` até `connected`.

**API CRM:**

```http
POST /api/integrations/whatsapp/session
Content-Type: application/json

{
  "method": "pairing",
  "phone": "5511987654321",
  "reset": true
}
```

`reset: true` remove instância antiga no GO antes de criar (troca de número).

## QR Code (API)

```http
POST /api/integrations/whatsapp/session
{ "method": "qr", "reset": true }
```

Polling renova QR via `GET /instance/qr` (token da instância). Ao conectar, o telefone salvo
vem só do JID do aparelho que escaneou.

## Teste em produção (QR)

1. CRM → Integrações → **Trocar número** (se já houver conexão).
2. **Conectar WhatsApp** → **QR Code** → marque **Limpar conexão anterior**.
3. No celular da empresa: WhatsApp → Aparelhos conectados → Escanear QR.
4. Confira no card o **+número** exibido (deve ser o do aparelho que escaneou).
5. Valide Inbox com mensagem de teste de outro celular.

## Variáveis (produção)

**CRM:** `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `NEXTAUTH_URL`  
**Evolution GO:** `POSTGRES_*`, `GLOBAL_API_KEY`, `DATABASE_SAVE_MESSAGES=false`, `SERVER_PORT=10000`

## Reutilizar em outro projeto

1. Copie `lib/integrations/evolution-go*` + rota `whatsapp/session`.
2. Aponte `EVOLUTION_API_URL` para o mesmo servidor GO ou outro deploy.
3. Use `startWhatsAppConnectSession()` — não chame Evolution direto da UI.

Repositório Evolution GO: https://github.com/evolution-foundation/evolution-go
