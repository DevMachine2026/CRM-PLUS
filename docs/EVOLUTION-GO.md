# Evolution GO — integração WhatsApp

O CRM usa [Evolution GO](https://github.com/EvolutionAPI/evolution-go) (não Evolution API v2 Node).

## Arquitetura

| Componente | Onde roda | Papel |
|------------|-----------|-------|
| CRM (Next.js) | Vercel | UI, API, webhooks `/api/webhooks/evolution` |
| Evolution GO | Render (Docker) | Instâncias WhatsApp, QR, envio/recebimento |
| Postgres + Redis | Render | Persistência GO |

Fluxo de conexão:

1. Usuário abre **Configurações → Integrações → WhatsApp**
2. `POST /api/integrations/whatsapp/session` → `create` + `connect` no GO (webhook registrado na connect)
3. UI faz polling `GET /api/integrations/whatsapp/session` → QR ou `connected`
4. Mensagens inbound chegam em `POST /api/webhooks/evolution` → inbox CRM

## Variáveis de ambiente (CRM)

```env
EVOLUTION_API_URL=https://seu-evolution-go.onrender.com
EVOLUTION_API_KEY=          # = GLOBAL_API_KEY no servidor GO
NEXTAUTH_URL=https://seu-crm.vercel.app
```

Sem `EVOLUTION_API_URL`: modo **demo** — QR SVG simulado e auto-conexão após ~5s.

## Credenciais salvas por tenant

```json
{
  "provider": "evolution",
  "evolutionApiVersion": "go",
  "evolutionInstanceName": "crmplus-<tenant>",
  "evolutionInstanceId": "<uuid-go>",
  "instanceToken": "...",
  "connectionState": "awaiting_scan | connected",
  "phoneNumber": "5511..."
}
```

## Código principal

| Arquivo | Função |
|---------|--------|
| `lib/integrations/evolution-go-client.ts` | Cliente HTTP GO (create, connect, QR, status) |
| `lib/integrations/evolution-client.ts` | Re-export compat (legado) |
| `lib/webhooks/parse-evolution-go-payload.ts` | Parser eventos `Message`, `QRCode`, `Connected` |
| `lib/integrations/sync-evolution-go-integration.ts` | Atualiza integração via webhook |
| `lib/channels/evolution-go-send.ts` | Envio outbound `POST /send/text` |
| `app/api/integrations/whatsapp/session/route.ts` | Sessão QR |
| `app/api/webhooks/evolution/route.ts` | Webhook inbound + lifecycle |

## Deploy Evolution GO (Render)

1. Web Service **Docker** do repo `evolution-foundation/evolution-go` (não é o CRM)
2. Postgres: dois bancos no mesmo cluster (`evogo_auth`, `evogo_users`) — **não** usar só `DATABASE_URL`
3. Variáveis obrigatórias no **Environment** (valores de exemplo):

```env
POSTGRES_AUTH_DB=postgresql://USER:PASS@dpg-xxx-a/evogo_auth?sslmode=require
POSTGRES_USERS_DB=postgresql://USER:PASS@dpg-xxx-a/evogo_users?sslmode=require
DATABASE_SAVE_MESSAGES=false
GLOBAL_API_KEY=<openssl rand -hex 32>
CLIENT_NAME=evolution
MINIO_ENABLED=false
AMQP_GLOBAL_ENABLED=false
SERVER_PORT=10000
```

Use a **Internal Database URL** do Postgres no Render (hostname `dpg-...-a`). `SERVER_PORT` deve ser igual ao `PORT` que o Render injeta (geralmente **10000** em web services — não 8080). `GLOBAL_API_KEY` = `EVOLUTION_API_KEY` no CRM.

4. **Save** → **Manual Deploy** → status **Live**
5. Abrir a URL pública uma vez para ativar licença (Magic Link)
6. No CRM: `EVOLUTION_API_URL` + `EVOLUTION_API_KEY` + `NEXTAUTH_URL`

Se o deploy falhar com **Exited with status 1**, abra **Logs** (runtime, não build): mensagens comuns são `required database configuration variables are missing`, `required configuration variable is missing` (`DATABASE_SAVE_MESSAGES` ou `GLOBAL_API_KEY`), ou MinIO com `MINIO_ENABLED=true` sem credenciais.

## Webhook GO → CRM

Registrado automaticamente em `POST /instance/connect`:

```
{NEXTAUTH_URL}/api/webhooks/evolution[?token=<EVOLUTION_WEBHOOK_SECRET>]
```

Autenticação (produção): header `apikey` = `EVOLUTION_API_KEY`, ou `?token=` / `x-evolution-webhook-token`, ou `instanceToken` no payload = token da instância no CRM.

Idempotência: `externalMessageId` duplicado por tenant é ignorado. Falha de processamento retorna **500** para o GO reentregar.

Eventos tratados:

- `QRCode` — atualiza QR na integração
- `Connected` / `PairSuccess` — marca `connected` + telefone
- `Message` — enfileira mensagem no inbox

Compat legado: payloads Evolution API v2 (Baileys) ainda são parseados em dev.

## Limitações atuais (MVP)

- Sem criação automática de `Opportunity` no inbound

## Envio outbound

O inbox usa `resolveWhatsAppSendRoute` → se a integração for Evolution GO conectada, envia via `POST /send/text` com o **instance token** (não a GLOBAL_API_KEY).

Modo demo (sem `EVOLUTION_API_URL`): `externalStatus: simulated`.

## Teste local sem GO

```bash
# .env.local sem EVOLUTION_API_URL
npm run dev
# Hub → Conectar WhatsApp → aguardar ~5s → connected (simulado)

# Simular mensagem Meta (alternativa):
curl -X POST "http://localhost:3000/api/webhooks/whatsapp?tenantId=<UUID>" \
  -H "Content-Type: application/json" \
  -d '{"entry":[...]}'
```
