# Integração Make → CRM (Uala Car)

**Gabriel:** adicionar 1 módulo HTTP **em paralelo** ao bot. Z-API e cenários atuais **não mudam**. Se o CRM falhar, o bot segue normal.

---

## Módulo HTTP no Make

| Campo | Valor |
|-------|--------|
| Método | `POST` |
| URL | `https://crm-plus-kappa.vercel.app/api/webhooks/whatsapp` |
| Header | `client-token: F6996863B899A2FC33CE0201` |
| Header | `Content-Type: application/json` |
| Body | **JSON bruto** do webhook Z-API (mapear o bundle inteiro — **não** montar JSON fixo na mão) |

Token na URL (alternativa): `?token=F6996863B899A2FC33CE0201`

---

## Body errado vs certo

### Errado (o que está acontecendo hoje)

JSON montado na mão com `phone` fixo. Todos os clientes caem no mesmo chat:

```json
{
  "phone": "558586532728",
  "senderName": "Ronald",
  "text": { "message": "Oi" },
  "fromMe": false,
  "isGroup": false,
  "messageId": "ACE78B163EB33CD5BD39ECD42CC00EBC",
  "instanceId": "3E4B85DE16A4201D8D5C5E06DC0B5B06"
}
```

Problemas:
- `phone` sempre `558586532728` (parece linha comercial, dígito errado) — **não é o cliente**
- `senderName` muda (Ronald, Luciba, Renato…) mas o CRM agrupa por `phone`
- Qualificação de lead mistura vários clientes numa conversa só

### Certo (o que fazer)

No Make: **Body type = Raw**, **Content type = JSON**, conteúdo = **objeto inteiro** do webhook Z-API (ex.: `{{1}}` ou o bundle do gatilho), sem remapear campo a campo.

Exemplo quando **Ronald** (`85991993833`) manda "Oi":

```json
{
  "phone": "5585991993833",
  "senderName": "Ronald",
  "text": { "message": "Oi" },
  "fromMe": false,
  "isGroup": false,
  "momment": 1781034394000,
  "messageId": "ACE78B163EB33CD5BD39ECD42CC00EBC",
  "instanceId": "3E4B85DE16A4201D8D5C5E06DC0B5B06",
  "connectedPhone": "5585865327228"
}
```

Exemplo quando **Luciba** manda mensagem — só muda `phone`, `senderName` e `messageId`:

```json
{
  "phone": "5585XXXXXXXXX",
  "senderName": "Luciba",
  "text": { "message": "..." },
  "fromMe": false,
  ...
}
```

Checklist rápido no request do Make:
- `phone` = número do **cliente** que mandou (muda a cada pessoa)
- `fromMe` = `false` para mensagem do cliente
- `instanceId` = o que veio da Z-API — não copiar/fixar manualmente
- `text.message` e `messageId` = da Z-API, sem inventar

---

## Regras críticas

- HTTP no **mesmo cenário** do webhook Z-API, **paralelo** ao bot — não substituir o gatilho.
- Body = output da Z-API **sem remapear** `instanceId`, `phone`, `text`, `messageId`, `fromMe`.
- Mensagem do **cliente** → `fromMe: false` e `phone` = telefone do **cliente**.
- Se `fromMe: true` ou `phone` errado, a mensagem aparece **à direita** no CRM (saída) — está errado.
- `instanceId` da Uala (`3E4B85DE16A4201D8D5C5E06DC0B5B06`) já vem no JSON da Z-API — não alterar.

---

## Campos que o CRM usa

| Campo | Obrigatório |
|-------|-------------|
| `instanceId` | Sim |
| `phone` | Sim (DDI + DDD, só dígitos) — **do cliente** |
| `text.message` | Sim |
| `messageId` | Sim |
| `fromMe` | Sim |
| `senderName`, `momment` | Não (mas `senderName` ajuda) |

Ignorado: `isGroup: true`, duplicata de `messageId`, sem texto.

---

## Workaround no CRM (enquanto o Make não corrige)

O CRM detecta `phone` da linha comercial e separa contatos pelo `senderName` (`zapi-push:ronald`, etc.). Isso **não substitui** o fix no Make: dois clientes com o mesmo nome ainda podem misturar. O ideal é mandar o JSON bruto com `phone` correto.

---

## Sucesso vs erro

| Situação | Como saber |
|----------|------------|
| **OK** | Response: `"provider":"zapi"`. No CRM: mensagem **à esquerda**, contato com telefone do cliente. |
| **200 falso** | Response: `"skipped":true` — body incompleto ou inválido. |
| **401** | Falta ou erro no `client-token`. |
| **400** | Falta `instanceId` ou não bate com integração. |

**Teste:** celular externo manda mensagem → bot responde → CRM **Conversas → Todas** (não só Prioridade Alta).

---

## Se não aparecer no CRM

1. Na **execução real** (não “Run once”): módulo HTTP rodou?
2. Request body = JSON da Z-API? `fromMe: false` para cliente? `phone` muda por cliente?
3. Response body = `"provider":"zapi"` ou `skipped` / `401`?
4. Bot respondeu mas CRM vazio → problema no HTTP desta execução, não no bot.

---

## Contatos

| | |
|-|-|
| CRM (endpoint, token, Inbox) | Ronald (RonalDigital) |
| Make, Z-API, bot | Gabriel |
