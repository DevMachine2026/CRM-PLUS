# CRM PLUS — Estado do projeto e plano até a visão final

> **Para:** Ronald (produto / entrega)  
> **Data:** 20 de maio de 2026  
> **Objetivo:** Ler uma vez, entender o que existe, o que é demo, e traçar o caminho até o CRM “que você pensou”.

Documentos relacionados: [VISAO-GERAL.md](../VISAO-GERAL.md) (pitch comercial) · [SDD.md](../SDD.md) (especificação técnica) · [GUIA-DE-TESTES.md](../GUIA-DE-TESTES.md) (validação).

---

## 1. A visão que você desenhou (em uma frase)

**CRM operacional autônomo:** mensagem chega no WhatsApp/Instagram → sistema cria lead e conversa → **IA qualifica e age** → vendedor só valida e fecha. Conectar canais e configurar a agente (Sara) deve ser **absurdamente simples** (QR + login social + switch de IA).

---

## 2. O que o projeto é hoje (realidade honesta)

### 2.1 Nível de maturidade por área

| Área | Status | Comentário |
|------|--------|------------|
| **UI/UX (dashboard, listas, drawers)** | ✅ Avançado | Estilo Linear/Stripe, sidebar leve, `FormDrawer`, tokens `ds` |
| **CRM core** (contatos, empresas, pipeline, tarefas, faturamento) | ✅ Funcional | CRUD multi-tenant, permissões por perfil |
| **Inbox / conversas** | ✅ Funcional | Mensagens, ações de IA na UI (resumir, intenção, sugerir resposta) |
| **IA (Gemini/Claude)** | 🟡 Parcial | Motor real em `lib/ai/provider.ts`; ações com fallback mock se API falhar |
| **Integrações — UI nova** | 🟡 Demo | Hub em `/settings/integrations` (QR WhatsApp, páginas IG demo, switch Sara) |
| **Integrações — produção** | 🔴 Pendente | Evolution API + OAuth Meta reais |
| **IA autônoma (responder sozinha no canal)** | 🔴 Não feito | Análise em background sim; **sem envio outbound** automático |
| **Switch `aiEnabled`** | 🔴 Só UI | Salvo no banco; **não desliga** o pipeline de IA nos webhooks |
| **Dev experience** | 🟡 Frágil | Turbopack + projeto em `/mnt/hd/` → cache corrompido, compilações de 30–120s |

**Resumo:** você tem um **CRM completo e apresentável**, com **IA assistiva** (sugestões e análise) e **integrações em modo demonstração**. Ainda **não** é o “sistema que responde e qualifica sozinho no WhatsApp” de ponta a ponta.

---

## 3. Arquitetura em 3 camadas (como tudo se conecta)

```
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 1 — CANAIS (entrada/saída de mensagens)                 │
│  WhatsApp: Evolution API (QR)  OU  Meta Cloud API (tokens)      │
│  Instagram: Meta Graph API (OAuth + página)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ webhooks HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 2 — CRM (dados e regras)                                │
│  Webhooks → processInboundMessage → Contact, Conversation, Msg    │
│  Tabela integrations (credentials + webhookUrl por tenant_id)   │
│  Automações (engine + logs)                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ quando há texto para interpretar
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 3 — IA (Gemini / Claude)                                │
│  settings.ai: Sara, tom, instruções (systemPrompt)                │
│  Ações: classify-lead, summarize, detect-intent, suggest-reply… │
│  Futuro: auto-resposta outbound respeitando aiEnabled           │
└─────────────────────────────────────────────────────────────────┘
```

**Erro comum de entendimento:** a IA **não “entra” no WhatsApp**. Ela roda **no servidor**, depois que o webhook já gravou a mensagem no CRM.

---

## 4. O que já está implementado (detalhe)

### 4.1 Telas principais

| Rota | Função |
|------|--------|
| `/` | Landing |
| `/login`, `/register` | Auth (Auth.js) |
| `/dashboard` | Métricas + roteiro demo |
| `/inbox` | Conversas omnichannel |
| `/contacts`, `/companies`, `/opportunities`, `/pipeline` | CRM |
| `/tasks`, `/automations`, `/billing`, `/reports` | Operação e gestão |
| `/settings` | Empresa + config IA (formulário completo) |
| `/settings/integrations` | **Hub novo** (conexão simples) |
| `/settings/integrations?mode=advanced` | Formulário Meta legado (tokens manuais) |

### 4.2 Integrações (código)

| Peça | Arquivo / rota | Estado |
|------|----------------|--------|
| Provisionar integração + webhook URL | `lib/integrations/provision-integration.ts` | ✅ |
| Estados UI (desconectado → QR → conectado) | `lib/integrations/connection-state.ts` | ✅ |
| WhatsApp QR (Evolution) | `POST/GET /api/integrations/whatsapp/session` | ✅ demo se sem `EVOLUTION_API_URL` |
| Instagram páginas | `GET/POST /api/integrations/instagram/connect` | ✅ demo (lista fixa) |
| Webhook Evolution | `POST /api/webhooks/evolution` | ✅ |
| Webhook Meta WhatsApp/Instagram | `/api/webhooks/whatsapp`, `instagram` | ✅ (Meta) |
| Resolver tenant no webhook | `lib/webhooks/resolve-tenant.ts` | ✅ Meta + Evolution instance |
| Fila / log webhook | `lib/webhooks/ingest.ts` | ✅ (Evolution usa; Meta pode evoluir) |

### 4.3 Inteligência artificial

| Recurso | Onde | Disparo |
|---------|------|---------|
| Classificar lead | `classify-lead.ts` | Novo contato, webhook inbound |
| Resumir conversa | `summarize-conversation.ts` | Webhook + botão na inbox |
| Detectar intenção | `detect-intent.ts` | Webhook + botão |
| Sugerir resposta | `suggest-reply.ts` | Botão na inbox (humano envia) |
| Próxima ação | `suggest-next-action.ts` | Oportunidade / intenção de compra |
| Leads parados | `detect-stalled-leads.ts` | Cron / API |
| Persona Sara | `tenant.settings.ai` + Integrações | Salvo; usado em `getTenantAiSystemPrompt` |

**Variáveis de ambiente (IA):**

```env
AI_PROVIDER=gemini
GOOGLE_AI_API_KEY=...    # nome correto (não GEMINI_API_KEY)
```

### 4.4 O que a documentação oficial diz vs o código

O [SDD.md](../SDD.md) e [VISAO-GERAL.md](../VISAO-GERAL.md) descrevem o **produto-alvo** (autônomo por padrão). O código está **mais próximo de um CRM assistido por IA** do que de um bot totalmente autônomo nos canais.

---

## 5. Lacunas em relação à sua visão

| Você imaginou | Situação atual | Esforço típico |
|---------------|----------------|----------------|
| Clicar “Conectar WhatsApp” → QR real → número ativo | QR **demo** sem Evolution em produção | 0,5–1 dia (Evolution hospedada + env) |
| Login Facebook → escolher página Instagram | Lista **demo** de páginas | 1–2 dias (app Meta + OAuth) |
| Sara responde sozinha no WhatsApp/IG | Só **sugere** texto na inbox | 1–2 dias (outbound + `aiEnabled`) |
| Switch “Ativar IA” liga/desliga tudo | Switch **só salva** config | 2–4 horas |
| Zero configuração Meta para o cliente | Modo avançado ainda existe | OK como fallback |
| Sistema “age sozinho” no funil | IA sugere; movimento automático **parcial** | Várias iterações |

---

## 6. Modos de operação (para não confundir na demo)

### Modo A — Demonstração / validação sem Evolution (recomendado agora)

- `EVOLUTION_API_URL` **vazio** → WhatsApp conecta sozinho após ~5s (fake).
- Instagram → escolhe página da lista demo.
- `AI_PROVIDER=gemini` + chave → IA real nas ações da inbox.
- Mensagens inbound → **webhook simulado** (`curl` / Postman), não celular real.
- **Guia completo:** [ENTREGA-SEM-EVOLUTION.md](./ENTREGA-SEM-EVOLUTION.md)
- **Roteiro:** Integrações → Inbox → Sugerir resposta / Resumir → Pipeline.

### Modo B — Piloto real (cliente piloto)

- Evolution API ou Meta Cloud configurados.
- Webhooks apontando para URL pública (Vercel/ngrok).
- Meta App Review para Instagram se necessário.

### Modo C — Produto final (sua visão)

- Conexão 1-clique estável.
- `aiEnabled` controla pipeline.
- Resposta automática com limites (horário, escopo, handoff humano).
- Métricas de “IA atuou / vendedor assumiu”.

---

## 7. Plano recomendado (fases)

### Fase 0 — Estabilizar ambiente (hoje, 30–60 min)

| # | Ação | Por quê |
|---|------|---------|
| 0.1 | `npm run dev:clean` ou `npm run dev:webpack` | Evitar ChunkLoadError / tela preta |
| 0.2 | Preferir projeto em **SSD** (não só `/mnt/hd`) | Compilação 5–10× mais rápida |
| 0.3 | Confirmar `GOOGLE_AI_API_KEY` + testar inbox | Provar IA real na demo |

### Fase 1 — Entrega “acreditável” (1 dia)

| # | Entrega | Critério de pronto |
|---|---------|-------------------|
| 1.1 | Demo script documentado | 15 min sem travar (ver VISAO-GERAL §11) |
| 1.2 | Integrações hub polido | Sem erros Base UI no console |
| 1.3 | 1 fluxo IA visível | Resumir + Sugerir resposta com Gemini |
| 1.4 | Texto “Como funciona” na tela Integrações | Cliente entende QR vs login Facebook |

### Fase 2 — Conexões reais (2–4 dias)

| # | Entrega | Dependências |
|---|---------|--------------|
| 2.1 | Evolution em servidor + `EVOLUTION_API_URL` | VPS ou Evolution Cloud |
| 2.2 | Webhook público HTTPS | Deploy Vercel ou túnel |
| 2.3 | Meta App: WhatsApp Cloud **ou** manter Evolution | Escolha única por produto |
| 2.4 | OAuth Instagram + seleção de página real | `META_APP_ID`, redirect URI |

### Fase 3 — IA autônoma controlada (3–5 dias)

| # | Entrega | Detalhe |
|---|---------|---------|
| 3.1 | Respeitar `aiEnabled` em `process-inbound.ts` e ações | Switch passa a significar algo |
| 3.2 | `auto-reply` outbound WhatsApp (Evolution send) | Só se `aiEnabled` + confiança |
| 3.3 | Mensagem “assumir conversa” / pausar bot | UX na inbox |
| 3.4 | Logs claros em `ai_logs` | Auditável para o contratante |

### Fase 4 — Autonomia de funil (contínuo)

| # | Entrega |
|---|---------|
| 4.1 | Movimento automático de estágio com confirmação |
| 4.2 | Automações padrão por tenant sempre ativas |
| 4.3 | Dashboard “saúde autônoma” (não só contadores) |

---

## 8. Checklist “está como eu pensei?”

Use como definição de pronto da **visão original**:

- [ ] Cliente conecta WhatsApp **sem** copiar Phone Number ID / token
- [ ] Cliente conecta Instagram **com** login social e escolha de página
- [ ] Webhook registrado **automaticamente** por empresa (`tenant_id`)
- [ ] Sara configurável em linguagem natural (instruções + tom)
- [ ] Com IA ligada, lead recebe resposta automática **dentro do escopo** definido
- [ ] Com IA desligada, só entra mensagem no CRM (sem bot)
- [ ] Vendedor vê o que a IA fez e pode corrigir
- [ ] Um único lugar (Inbox) para WhatsApp + Instagram
- [ ] Demo roda em &lt; 5s após primeira compilação (ambiente estável)

---

## 9. Roteiro de leitura e arquivos-chave

**Leitura (ordem sugerida):**

1. Este documento (estado + plano)  
2. [VISAO-GERAL.md](../VISAO-GERAL.md) — como vender  
3. [GUIA-DE-TESTES.md](../GUIA-DE-TESTES.md) — como validar  
4. [SDD.md](../SDD.md) — quando for implementar detalhe técnico  

**Código — integrações + IA:**

```
app/(dashboard)/settings/integrations/
  page.tsx                    # hub vs advanced
  integrations-hub-client.tsx
components/integrations/      # sheets WhatsApp/Instagram, seção IA
lib/integrations/             # evolution, provision, connection-state
lib/webhooks/                 # process-inbound, resolve-tenant, ingest
lib/ai/                       # provider, actions, tenant-settings
```

**Comandos úteis:**

```bash
npm run dev:clean      # dev após erro de cache
npm run dev:webpack    # alternativa estável em HD lento
npm run db:seed        # dados demo
npx tsc --noEmit       # checagem TypeScript
```

---

## 10. Decisões que você precisa tomar (1 página)

Responda mentalmente — isso define o próximo sprint:

1. **WhatsApp em produção:** Evolution (QR simples) **ou** Meta Cloud API (oficial, mais burocracia)?  
2. **Demo de amanhã:** aceita **modo simulado** nos canais + **IA real** na inbox? (recomendado: sim)  
3. **Autonomia:** Sara **só sugere** na v1 entregue **ou** precisa **responder sozinha** na v1?  
4. **Hospedagem:** Vercel + Neon/Supabase já definidos?  
5. **Projeto no HD externo:** move para SSD local antes de mais dev?

---

## 11. Síntese final

| Pergunta | Resposta curta |
|----------|----------------|
| O projeto está longe da visão? | **Não** na base (CRM + IA + UI). **Sim** no “último milha” (canais reais + bot outbound + switch IA). |
| Dá para apresentar amanhã? | **Sim**, como **CRM inteligente assistido** + integrações em demo + Gemini ativo. |
| O que falta para a visão completa? | Evolution/Meta reais + `aiEnabled` + envio automático + ambiente dev estável. |
| Por onde começar segunda-feira? | Fase 2 (WhatsApp real) **ou** Fase 3 (auto-reply), conforme prioridade do contratante. |

---

*Documento gerado para alinhamento interno. Atualize a seção 2 quando concluir cada fase.*
