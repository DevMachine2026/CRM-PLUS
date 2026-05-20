# Entregar e validar o CRM PLUS sem Evolution API

> Use este guia quando precisar **validar todas as funcionalidades** antes de contratar/hospedar o Evolution GO.  
> **Não é necessário** `EVOLUTION_API_URL` no `.env.local`.  
> Para produção com WhatsApp real, veja **[EVOLUTION-GO.md](./EVOLUTION-GO.md)**.

---

## 1. O que “sem Evolution” significa

| Funciona sem Evolution | Não funciona sem Evolution (ainda) |
|------------------------|-------------------------------------|
| CRM completo (contatos, pipeline, tarefas, faturamento) | Mensagens reais vindas do app WhatsApp do cliente |
| Inbox + conversas (seed, manual, webhook simulado) | QR Code escaneado no celular de verdade |
| IA Gemini/Claude (resumir, intenção, sugerir resposta) | Envio de mensagem outbound para número real via Evolution |
| UI Integrações (conectar WhatsApp/Instagram em **modo demo**) | Webhook `/api/webhooks/evolution` com instância real |
| Webhook **Meta simulado** (`curl` / Postman) | — |
| Automações, dashboard, relatórios | — |

**Frase para o contratante:**  
*"Nesta fase validamos o cérebro do CRM e a experiência de conexão. A Evolution liga o número real do WhatsApp quando formos para produção."*

---

## 2. Configuração mínima do `.env.local`

```env
DATABASE_URL="..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
AUTH_SECRET="..."

# IA real (recomendado para validar inteligência)
AI_PROVIDER="gemini"
GOOGLE_AI_API_KEY="sua-chave"

# Evolution — DEIXE VAZIO / NÃO DEFINA
# EVOLUTION_API_URL=
# EVOLUTION_API_KEY=

CRON_SECRET="dev-cron-secret-local"
```

Com `EVOLUTION_API_URL` ausente, o sistema entra em **modo simulado** automaticamente (`lib/integrations/evolution-client.ts`).

---

## 3. Estratégia de validação em 4 trilhas

### Trilha A — CRM + IA (sem canal externo)

Valida ~80% do valor do produto.

1. `npm run db:seed` (se quiser dados demo) **ou** `/register` para tenant novo  
2. Navegue: Dashboard → Contatos → Pipeline → Oportunidades → Tarefas → Faturamento  
3. **Inbox:** abra conversa existente (seed) ou crie fluxo manual  
4. Teste IA na inbox: **Resumir**, **Detectar intenção**, **Sugerir resposta**  
5. **Settings → Integrações:** ligue Sara, salve instruções  
6. **Settings → Empresa:** config IA completa (nome, tom)

**Pronto quando:** todas as telas carregam, IA responde com Gemini (não `mock` nos logs).

---

### Trilha B — UI de integrações (demo visual)

Valida a experiência “1 clique” **sem** API externa.

1. `/settings/integrations`  
2. **WhatsApp:** Conectar → QR demo → ~5s → **Conectado** (badge verde, “Modo demo”)  
3. **Instagram:** Conectar → escolher página demo → **Conectado**  
4. Opcional: `?mode=advanced` — formulário Meta para quem quiser testar tokens depois  

**Pronto quando:** fluxo Desconectado → QR/Lista → Conectado sem erro no console.

> Isso grava `integrations` no banco com `webhookUrl` — útil para testar resolução de tenant depois.

---

### Trilha C — Mensagens “como se viessem do WhatsApp” (webhook simulado)

Valida **pipeline completo**: webhook → contato → conversa → IA em background.

**Passo 1 — Obter `tenantId`**

```sql
SELECT id, name FROM tenants ORDER BY created_at DESC LIMIT 1;
```

Ou após login, use o tenant da sessão.

**Passo 2 — (Opcional) Conectar WhatsApp demo no hub**  
Assim o `phone_number_id` da integração pode bater com o payload.

**Passo 3 — Disparar mensagem simulada**

```bash
TENANT_ID="cole-o-uuid-aqui"

curl -X POST "http://localhost:3000/api/webhooks/whatsapp?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "WABA_ID",
      "changes": [{
        "field": "messages",
        "value": {
          "messaging_product": "whatsapp",
          "metadata": { "phone_number_id": "PHONE_ID" },
          "contacts": [{ "profile": { "name": "Maria Santos" }, "wa_id": "5511999998888" }],
          "messages": [{
            "from": "5511999998888",
            "id": "wamid.teste001",
            "timestamp": "1715000000",
            "type": "text",
            "text": { "body": "Olá! Preciso de um orçamento para 50 usuários." }
          }]
        }
      }]
    }]
  }'
```

**Passo 4 — Verificar**

- Resposta `200` com `{ "processed": 1, ... }`  
- **Inbox:** nova conversa ou mensagem em thread existente  
- **Contatos:** Maria Santos criada/atualizada  
- Supabase: `ai_logs` com `webhook_received`, `classify_lead`, etc.

Repita com `wamid.teste002` e outro texto para testar idempotência e intenções diferentes.

Detalhes e payload Instagram: **[GUIA-DE-TESTES.md](../GUIA-DE-TESTES.md)** §4.11 e §4.12.

---

### Trilha D — Conta demo + roteiro comercial

Para apresentação sem explicar Evolution.

1. Login: `/login?demo=1` (se seed configurou demo)  
2. Siga **[VISAO-GERAL.md](../VISAO-GERAL.md)** seção 11 (15–20 min)  
3. Mostre integrações em modo demo + inbox com IA real  

---

## 4. O que dizer na entrega (escopo Fase 1)

**Incluído nesta entrega:**

- Plataforma CRM multi-empresa operacional  
- IA nativa (qualificação, resumo, intenção, sugestão de resposta)  
- Experiência de conexão de canais (protótipo funcional em demo)  
- Webhooks prontos para Meta e Evolution (testáveis via simulação)  

**Próxima fase (após sua validação):**

- Evolution API em produção **ou** Meta Cloud API oficial  
- OAuth real Instagram  
- Resposta automática da Sara nos canais (outbound)  

---

## 5. Checklist de validação antes de comprar Evolution

Marque conforme for testando:

### Core CRM
- [ ] Registro de empresa + login  
- [ ] Contatos (CRUD, detalhe)  
- [ ] Empresas, produtos, tags  
- [ ] Pipeline / oportunidades (mover estágio)  
- [ ] Tarefas e atividades  
- [ ] Faturamento / faturas  
- [ ] Relatórios e dashboard  
- [ ] Equipe e permissões (se aplicável)  

### IA (Gemini ligado)
- [ ] Sugerir resposta na inbox  
- [ ] Resumir conversa  
- [ ] Detectar intenção (+ tarefa se aplicável)  
- [ ] Classificação ao criar contato  
- [ ] Config Sara em Integrações + Settings  

### Canais (sem Evolution)
- [ ] Hub integrações: WhatsApp demo conecta  
- [ ] Hub integrações: Instagram demo conecta  
- [ ] Webhook WhatsApp simulado (`curl`) cria conversa  
- [ ] Webhook Instagram simulado (GUIA §4.12)  
- [ ] Automações visíveis na timeline  

### Não testar agora (depende Evolution/Meta real)
- [ ] QR escaneado no celular  
- [ ] Cliente recebe mensagem da Sara no WhatsApp  
- [ ] Login Facebook real  

---

## 6. Quando for a hora da Evolution

1. Hospedar Evolution API (VPS ou serviço gerenciado)  
2. Adicionar ao `.env`:

   ```env
   EVOLUTION_API_URL="https://sua-evolution.exemplo.com"
   EVOLUTION_API_KEY="sua-chave"
   ```

3. URL pública do CRM (Vercel) para webhooks  
4. Remover dependência de `?tenantId=` em produção (já bloqueado fora de dev)  
5. Testar QR real e uma mensagem inbound real  

Nenhuma mudança grande na UI do hub — o mesmo fluxo passa a usar QR verdadeiro.

---

## 7. Problemas comuns

| Problema | Solução |
|----------|---------|
| Tela preta / Carregando infinito | `npm run dev:clean` ou `npm run dev:webpack` |
| IA sempre mock | `GOOGLE_AI_API_KEY` + `AI_PROVIDER=gemini`, reiniciar dev |
| Webhook 400 tenant | Passar `?tenantId=` ou conectar integração com `phone_number_id` igual ao payload |
| WhatsApp não conecta no QR | Normal sem Evolution; aguarde ~5s no modo demo |

---

## 8. Documentos relacionados

- [ESTADO-DO-PROJETO-E-PLANO.md](./ESTADO-DO-PROJETO-E-PLANO.md) — visão geral e fases  
- [GUIA-DE-TESTES.md](../GUIA-DE-TESTES.md) — passo a passo técnico completo  
- [VISAO-GERAL.md](../VISAO-GERAL.md) — roteiro para contratante  
