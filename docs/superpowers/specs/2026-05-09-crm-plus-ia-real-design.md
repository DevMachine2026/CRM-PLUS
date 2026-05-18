# Design Spec — CRM PLUS: IA Real + Ambiente Local

**Data:** 2026-05-09  
**Status:** Aprovado para implementação  
**Abordagem escolhida:** B — feature-by-feature na ordem de dependência técnica

---

## Contexto

O CRM PLUS já possui estrutura de IA completa em `/lib/ai/` com mocks funcionais. O objetivo é substituir os mocks por Claude real e adicionar as funcionalidades que diferenciam o produto no mercado. Toda implementação deve ser incremental e não pode quebrar o sistema existente.

Stack: Next.js 16.2.4 · React 19 · Prisma 7.8 · PostgreSQL (Supabase) · NextAuth v5 · Claude Anthropic SDK.

---

## Decisões de Arquitetura

| Decisão | Dev/Testes | Produção | Motivo |
|---------|-----------|----------|--------|
| Banco local | Supabase CLI + Docker | Supabase cloud (contratante) | Isolamento total |
| Provider de IA | **Google Gemini** (gratuito) | **Claude Anthropic** | Gemini: zero custo no dev; Claude: qualidade máxima em prod |
| Modelo rápido | `gemini-2.0-flash` | `claude-haiku-4-5` | Classify, detect-intent, suggest-reply |
| Modelo qualidade | `gemini-2.5-pro` | `claude-sonnet-4-6` | Summarize, follow-up, alertas |
| Escala (Redis/BullMQ/WS) | Sprint 2 separado | Sprint 2 separado | IA real primeiro, escala quando houver volume |

### Estratégia dual-provider

A troca de provider é 100% via variável de ambiente — nenhuma linha de código muda entre dev e prod:

```bash
# .env.local (desenvolvimento/testes)
AI_PROVIDER=gemini
GOOGLE_AI_API_KEY=AIza...       # gratuito em aistudio.google.com

# .env.production (produção)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

O `getAIProvider()` já faz o switch automaticamente — o stub Gemini em `lib/ai/providers/gemini.ts` será implementado como parte deste sprint.

### Mapeamento de modelos por provider

| Tarefa | Gemini (dev) | Claude (prod) |
|--------|-------------|---------------|
| classify-lead | `gemini-2.0-flash` | `claude-haiku-4-5` |
| detect-intent | `gemini-2.0-flash` | `claude-haiku-4-5` |
| suggest-reply | `gemini-2.0-flash` | `claude-haiku-4-5` |
| summarize | `gemini-2.5-pro` | `claude-sonnet-4-6` |
| follow-up | `gemini-2.5-pro` | `claude-sonnet-4-6` |
| alertas de gargalo | `gemini-2.5-pro` | `claude-sonnet-4-6` |

O modelo é selecionado internamente por cada action em `lib/ai/actions/`, baseado no provider ativo. A interface `AIProvider` permanece idêntica — actions não sabem qual provider está ativo.

**Padrão fixo para todas as features de IA:**
```
Trigger → lib/ai/actions/<action>.ts → getAIProvider() → [Gemini | Claude]
  → Prisma: salva resultado → Prisma: insere AiLog (registra provider usado) → Resposta
```

---

## Sub-projeto 1 — Ambiente Local

### Objetivo
Banco PostgreSQL local isolado, idêntico ao de produção, com dados realistas para desenvolvimento e testes sem acesso ao banco do contratante.

### Arquivos a criar
- `scripts/setup-dev.sh` — automatiza todo o setup: instala Supabase CLI, sobe Docker, sincroniza Prisma, roda seed
- `prisma/seed.ts` — 2 tenants, 20 contatos PT-BR, 10 oportunidades, 5 pipelines, 30 conversas, 50 mensagens, 15 tarefas, 8 produtos
- `.env.local.example` atualizado com portas do Supabase local + `AI_PROVIDER=gemini` + `GOOGLE_AI_API_KEY` + `CRON_SECRET`

### Fluxo de setup
```
supabase init
supabase link --project-ref <ref-do-contratante>
supabase db pull                     # baixa schema atual de produção
supabase start                       # sobe banco em localhost:54322
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
npx prisma db push                   # sincroniza schema Prisma
npx prisma db seed                   # popula com dados de teste
```

### Restrições
- `DATABASE_URL` de produção nunca é tocada
- O `setup-dev.sh` valida se Docker está rodando antes de prosseguir
- Seed usa `upsert` com IDs fixos (idempotente — pode rodar múltiplas vezes)

---

## Sub-projeto 2 — classify-lead (IA real)

### Objetivo
Ao criar ou atualizar um contato, Claude analisa os dados disponíveis e retorna `lead_score` (0–100), classificação (hot/warm/cold) e tags sugeridas. Resultado salvo no banco automaticamente.

### Trigger
`POST /api/contacts` e `PATCH /api/contacts/[id]` — Claude é chamado com `await` após salvar o contato. Haiku responde em ~1–2s, dentro do timeout da rota. Resultado retornado na própria resposta da API.

### Prompt Strategy
Input: nome, telefone, origem do lead, empresa vinculada, cargo, canal de entrada, histórico de tags existentes.  
Output JSON: `{ score: number, classification: "hot"|"warm"|"cold", tags: string[], justification: string }`

### Mudanças no banco
- Atualiza `contacts.lead_score`
- Aplica tags via `ContactTag` (criação da relação). A atribuição à IA é rastreada via `AiLog`, não via campo em `ContactTag` (o modelo não tem `appliedBy` — adicionar em Sprint 2 se necessário)
- Insere em `AiLog` com action `"classify-lead"`

### Frontend
- Badge colorido no card do contato: 🔴 Hot / 🟡 Warm / 🔵 Cold
- Tooltip com justificativa da IA ao hover
- Score numérico visível na listagem e no perfil do contato

---

## Sub-projeto 3 — suggest-reply (IA real)

### Objetivo
No inbox, ao abrir uma conversa, Claude gera 3 sugestões de resposta com tons diferentes. Vendedor aceita, edita ou ignora.

### Trigger
`GET /api/conversations/[id]/suggest-reply` — chamado pelo frontend ao abrir a conversa (já existe o endpoint, está com mock).

### Prompt Strategy
Input: últimas 10 mensagens da conversa + nome do contato + produto de interesse (se houver oportunidade vinculada).  
Output JSON: `{ suggestions: [{ tone: "professional"|"friendly"|"urgent", text: string }] }`

### Frontend
- 3 chips abaixo do campo de mensagem: "Profissional · Amigável · Urgente"
- Clicar popula o campo de texto (editável)
- Botão "Gerar novas sugestões" para re-chamar
- Indicador de loading (skeleton) enquanto Claude processa

### Restrições
- Não bloqueia a abertura do inbox — carregamento lazy
- Cache de 5 min por `conversation_id` no servidor (Map em memória, suficiente para Sprint 1)

---

## Sub-projeto 4 — detect-intent → create-opportunity (IA real)

### Objetivo
Ao salvar uma nova mensagem inbound, Claude detecta intenção de compra. Se confiança ≥ threshold do tenant (padrão: 70%), cria oportunidade automaticamente no pipeline padrão e notifica o vendedor.

### Trigger
`POST /api/conversations/[id]/messages` — chamado após salvar a mensagem no banco.

### Prompt Strategy
Input: últimas 5 mensagens + dados do contato + lista de pipelines disponíveis.  
Output JSON: `{ intent: "buy"|"quote"|"complaint"|"neutral", confidence: number, suggested_title: string, suggested_value?: number, pipeline_id: string, stage_id: string, excerpt: string }`

### Fluxo de criação automática
```
confidence ≥ tenant.settings.intent_threshold (default: 0.70)
  → POST interno para criar Opportunity
  → Oportunidade criada com source = "ai"
  → AiLog registrado
  → Resposta inclui { opportunityCreated: true, opportunity: {...} }
```

### Frontend
- Banner não-intrusivo no inbox: "IA detectou interesse de compra — [oportunidade criada]"
- Link para a oportunidade criada
- Botão "Desfazer" (soft delete da oportunidade por 60s)

### Mudanças no banco
- Cria `Opportunity` com `created_by = null` (indica IA)
- Salva trecho motivador em `notes`
- Insere em `AiLog` com action `"detect-intent"`

---

## Sub-projeto 5 — summarize + histórico consolidado (IA real)

### Objetivo
Claude gera resumo executivo do contato em 3–5 frases + próximos passos recomendados. Agrega dados de conversas, oportunidades abertas, tarefas pendentes e histórico de tags.

### Trigger
`GET /api/conversations/[id]/summarize` — já existe, está com mock.  
Adicionalmente: `GET /api/contacts/[id]/summary` — novo endpoint para o perfil completo do contato.

### Prompt Strategy
Input: últimas 20 mensagens + oportunidades abertas (título, valor, estágio) + tarefas pendentes + lead_score atual + tags aplicadas.  
Output JSON: `{ summary: string, keyPoints: string[], nextSteps: string[], sentiment: "positive"|"neutral"|"negative" }`

### Frontend (perfil do contato)
- Card "Resumo IA" no topo do perfil: texto + chips de key points
- Seção "Próximos Passos" com lista clicável (cada item pode virar tarefa com 1 clique)
- Atualização manual com botão "Atualizar resumo"
- Cache de 10 min (evita chamadas repetidas ao abrir o perfil)

---

## Sub-projeto 6 — follow-up autônomo (job recorrente)

### Objetivo
Job que roda a cada hora. Identifica contatos sem resposta há X dias (configurável por tenant, padrão: 3 dias). Para cada um, Claude gera mensagem de follow-up personalizada e cria tarefa do tipo "retorno" para o vendedor responsável.

### Implementação
- **Endpoint:** `POST /api/ai/follow-up` — protegido por header `Authorization: Bearer ${CRON_SECRET}`, chamado via Vercel Cron Jobs. Adicionar `CRON_SECRET` ao `.env.local.example`
- **Lógica de seleção:** `Conversation` com `status = "open"` e `last_message_at < now() - threshold` e sem `Task` pendente vinculada ao contato

### Prompt Strategy
Input: nome do contato, último tópico discutido (resumo das últimas 3 mensagens), produto de interesse, tempo de inatividade.  
Output JSON: `{ message: string, taskTitle: string, priority: "medium"|"high" }`

### Resultado
- Cria `Task` com `source = "ai"`, `type = "retorno"`, mensagem gerada como `description`
- Aplica tag `retorno urgente` se inatividade > 7 dias
- Insere em `AiLog`
- Notifica vendedor via `AiLog` (visível no dashboard "IA hoje")

### Vercel Cron config (`vercel.json`)
```json
{
  "crons": [{ "path": "/api/ai/follow-up", "schedule": "0 * * * *" }]
}
```

---

## Sub-projeto 7 — alertas de gargalo (job diário)

### Objetivo
Job diário que analisa o pipeline e detecta oportunidades paradas no mesmo estágio por mais de N dias (padrão: 7 dias). Claude gera alerta contextualizado para o gestor.

### Implementação
- **Endpoint:** `POST /api/ai/stalled` — já existe (com mock), será substituído por implementação real
- **Lógica de seleção:** `Opportunity` com `status = "open"` e `updated_at < now() - stalledDays` agrupadas por `assigned_to`

### Prompt Strategy
Input: lista de oportunidades paradas (título, valor, estágio, dias parado, responsável).  
Output JSON: `{ alerts: [{ opportunity_id, reason, recommended_action, urgency: "low"|"medium"|"high" }] }`

### Frontend (dashboard)
- Seção "Gargalos detectados" no `/dashboard`
- Cards com: oportunidade · dias parado · ação recomendada pela IA
- Botão "Criar tarefa" (pré-preenchida com a ação recomendada)
- Badge no sidebar com contagem de gargalos ativos

### Vercel Cron config
```json
{ "path": "/api/ai/stalled", "schedule": "0 8 * * *" }
```

---

## Tratamento de erros (padrão para todas as features)

Todas as chamadas ao Claude seguem o mesmo padrão de fallback:

```
try {
  resultado = await claude.complete(prompt)
  // parse JSON, validar com Zod
} catch (err) {
  // Claude falhou → não quebra a operação principal
  // AiLog com status "error"
  // Retorna resposta degradada (mock ou null)
  // Usuário vê UI sem o componente de IA, não vê erro
}
```

Nenhuma feature de IA pode quebrar o fluxo principal. IA falhou = UI degrada graciosamente.

---

## Ordem de entrega (Abordagem B confirmada)

| Ordem | Sub-projeto | Impacto | Dependências |
|-------|------------|---------|--------------|
| 1 | Ambiente local | Desbloqueia tudo | Docker |
| 2 | classify-lead | Score visível imediatamente | Ambiente |
| 3 | suggest-reply | Demo impactante no inbox | Ambiente |
| 4 | detect-intent → opportunity | Feature mais diferencial | Ambiente + conversas |
| 5 | summarize + histórico | Visão 360° do contato | Ambiente |
| 6 | follow-up autônomo | Autonomia real do sistema | Cron configurado |
| 7 | alertas de gargalo | Gestão proativa | Cron configurado |

---

## O que NÃO está neste sprint

- BullMQ + Redis (Sprint 2)
- WebSockets / Supabase Realtime (Sprint 2)
- Cache avançado com Redis (Sprint 2)
- WhatsApp Business API real (Fase 6 do SDD)
- Materiais de vendas / demo script (entregável separado)

---

## Arquivos que serão criados ou modificados

### Novos
- `scripts/setup-dev.sh`
- `prisma/seed.ts`
- `.env.local.example` (atualizado com Gemini + CRON_SECRET)
- `app/api/ai/follow-up/route.ts`
- `app/api/contacts/[id]/summary/route.ts`
- `app/(dashboard)/contacts/[id]/page.tsx` — perfil completo: linha do tempo + resumo IA + próximos passos
- `lib/ai/actions/detect-intent.ts`
- `lib/ai/actions/follow-up.ts`
- `lib/ai/actions/stalled-leads.ts` (substitui o mock existente)
- `components/ui/ai-badge.tsx`
- `components/ui/ai-suggestions.tsx`
- `components/ui/contact-summary.tsx`
- `components/ui/stalled-alert.tsx`

### Modificados (sem breaking changes)
- `lib/ai/providers/gemini.ts` — stub → implementação real com `@google/generative-ai`
- `lib/ai/index.ts` — adiciona seleção de modelo por provider (getModel helper)
- `lib/ai/actions/classify-lead.ts` — mock → IA real (Gemini dev / Claude prod)
- `lib/ai/actions/summarize-conversation.ts` — mock → IA real
- `lib/ai/actions/suggest-reply.ts` — mock → IA real
- `lib/ai/actions/detect-stalled-leads.ts` — mock → IA real (renomear para stalled-leads.ts)
- `app/(dashboard)/dashboard/page.tsx` — adiciona seção de gargalos detectados
- `app/(dashboard)/inbox/inbox-client.tsx` — integra sugestões de resposta + banner de oportunidade detectada
- `vercel.json` — adiciona bloco `crons` para follow-up (hourly) e stalled (daily 8h)
- `package.json` — adiciona `@google/generative-ai`

---

*Spec gerada em 2026-05-09 — CRM PLUS IA Real Sprint 1*
