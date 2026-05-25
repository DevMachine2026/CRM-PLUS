# Conexão WhatsApp — Evolution GO (guia profissional)

Arquitetura escalável para CRM PLUS e outros projetos que usam o mesmo padrão.

## Princípios

1. **Sem link externo** — QR e código gerados na própria UI do CRM.
2. **Dois métodos** — código no celular (mais confiável) e QR (alternativa).
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

## Método recomendado: código no celular (pairing)

Evita falhas comuns de QR expirado ou link quebrado.

**Fluxo:**

1. Usuário informa número (ex.: Eduardo `5511...`).
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

## Método alternativo: QR Code

```http
POST /api/integrations/whatsapp/session
{ "method": "qr", "reset": true }
```

Polling renova QR via `GET /instance/qr` (token da instância).

## Teste com número do Eduardo

1. Desconecte no manager Evolution se existir instância antiga.
2. CRM → Integrações → Conectar WhatsApp.
3. Escolha **Código no celular**.
4. Digite o número do Eduardo: `55` + DDD + número (só dígitos).
5. Marque **Limpar conexão anterior**.
6. Eduardo digita o código no WhatsApp dele.
7. Valide Inbox com mensagem de teste de outro celular.

## Variáveis (produção)

**CRM:** `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `NEXTAUTH_URL`  
**Evolution GO:** `POSTGRES_*`, `GLOBAL_API_KEY`, `DATABASE_SAVE_MESSAGES=false`, `SERVER_PORT=10000`

## Reutilizar em outro projeto

1. Copie `lib/integrations/evolution-go*` + rota `whatsapp/session`.
2. Aponte `EVOLUTION_API_URL` para o mesmo servidor GO ou outro deploy.
3. Use `startWhatsAppConnectSession()` — não chame Evolution direto da UI.

Repositório Evolution GO: https://github.com/evolution-foundation/evolution-go
