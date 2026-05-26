# ETAPA 6 — Go / No-Go (30 min antes da entrega)

> **Quando:** T−30 min antes da call com o contratante.  
> **Onde demo:** preferir **produção** (`https://crm-plus-kappa.vercel.app`). Local só se produção falhar (plano B).  
> **Pacote de entrega:** [ETAPA-5-PACOTE-ENTREGA.md](./ETAPA-5-PACOTE-ENTREGA.md)

---

## Cronômetro sugerido (30 min)

| Tempo | Ação |
|-------|------|
| T−30 | Abrir checklist abaixo; login produção |
| T−25 | Navegar 5 rotas (dashboard → integrações → inbox → pipeline → dashboard) |
| T−20 | Conectar WA + IG (modo demo); DevTools console limpo |
| T−15 | Inbox: **Resumir** + **Detectar intenção** (ou **Sugerir resposta**) — confirmar Gemini |
| T−10 | Repetir 3 respostas difíceis em voz alta (seção 5.3 da ETAPA 5) |
| T−5 | Fechar abas extras; modo “Não perturbe”; credenciais no canal seguro prontas |
| T−0 | GO → iniciar reunião |

---

## ✅ GO — todos precisam ser verdadeiros

Marque só quando **testou na URL que vai mostrar** (produção, salvo plano B).

### 1. Demo estável 15 min

- [ ] Navegou **≥ 15 min** (ou simulou: 5 rotas × 3 idas/voltas) **sem** `ChunkLoadError`, tela branca ou reload forçado
- [ ] Se demo for **local:** `npm run dev:webpack` ou `npm run dev:clean` — **não** `npm run dev` (Turbopack) em `/mnt/hd`
- [ ] Aba anônima / janela limpa (sem extensões que bloqueiem scripts)

**Como validar:** DevTools → Console: zero erros vermelhos ao abrir `/dashboard`, `/inbox`, `/settings/integrations`.

---

### 2. Pelo menos 2 ações de IA visíveis na inbox (Gemini real)

- [ ] Abriu **Inbox** → conversa com mensagens
- [ ] Executou **≥ 2** de: **Resumir** · **Detectar intenção** · **Sugerir resposta**
- [ ] Resposta **não** é claramente template mock (texto genérico repetido / prefixo `[mock]` em logs)

**Como validar Gemini (produção ou local):**

| Sinal | Gemini real | Provável mock |
|-------|-------------|----------------|
| Conteúdo | Resumo específico da conversa aberta | Frases genéricas iguais em qualquer conversa |
| Logs servidor / Network | `provider: gemini` ou modelo `gemini-2.0-flash` | `mock-v2`, `mock-v3` |
| Vercel / terminal | Sem `429` / quota no log da rota `/api/ai/*` | `429`, quota, ou `AI_PROVIDER=mock` |

**Pré-requisitos env (Vercel produção):**

```env
AI_PROVIDER=gemini
GOOGLE_AI_API_KEY=<chave válida com cota>
```

**Teste rápido local (opcional):** com sessão autenticada, rotas em `app/api/ai/` — ou inspecionar tabela `ai_logs` (`model_provider` ≠ `mock`).

---

### 3. Integrações em modo demo sem erro no console

- [ ] `/settings/integrations` carrega
- [ ] **WhatsApp:** Conectar → QR demo → **Conectado (demo)** em ~5–10 s
- [ ] **Instagram:** Conectar → página demo → **Conectado (demo)**
- [ ] Banner **Modo demonstração** visível (esperado nesta fase)
- [ ] Console **sem** erros vermelhos durante o fluxo

**GO se:** badges verdes + banner demo.  
**NO-GO se:** 500 na API, tela trava, ou `reading 'mode'` / erro React.

---

### 4. URL pública + login

- [ ] https://crm-plus-kappa.vercel.app responde (não 5xx prolongado)
- [ ] https://crm-plus-kappa.vercel.app/login?demo=1 abre formulário
- [ ] Login com credenciais demo **funciona** → redireciona para `/dashboard`
- [ ] `NEXTAUTH_URL` na Vercel = `https://crm-plus-kappa.vercel.app` (sem `/` final)

**Smoke rápido:**

```bash
curl -sI https://crm-plus-kappa.vercel.app/login | head -1
# esperado: HTTP/2 200
```

---

### 5. Três perguntas difíceis (sem hesitar)

Recite uma vez cada resposta ([ETAPA-5 § 5.3](./ETAPA-5-PACOTE-ENTREGA.md)):

- [ ] **"A Sara responde sozinha?"** → sugere agora; envio automático fase 2  
- [ ] **"Posso escanear o QR?"** → protótipo UI; número real fase 2 + Evolution  
- [ ] **"Funciona com minha página do Instagram?"** → OAuth Meta fase 2; aqui é experiência de conexão  

---

## Veredito

| Resultado | Ação |
|-----------|------|
| **5/5 ✅** | **GO** — usar produção no roteiro [ETAPA-5 § 5.2](./ETAPA-5-PACOTE-ENTREGA.md) |
| **4/5** | Decidir: item falho é visível na call? Se sim → **NO-GO** ou plano B |
| **≤ 3/5** | **NO-GO** — corrigir ou gravar demo local (Trilha A) |

---

## ❌ NO-GO — o que fazer

| Problema | Ação imediata | Plano B na reunião |
|----------|---------------|-------------------|
| **Deploy quebrado** (5xx, build failed) | `vercel deploy --prod` ou checar logs Vercel; rollback se necessário | **Gravação** da Trilha A local ([ENTREGA-SEM-EVOLUTION.md](./ENTREGA-SEM-EVOLUTION.md) § Trilha A) |
| **IA em mock** | Vercel: `GOOGLE_AI_API_KEY` + `AI_PROVIDER=gemini`; testar cota no [AI Studio](https://aistudio.google.com); redeploy | Mostrar inbox + explicar: *"hoje a cota está em modo demonstração; em produção contratada volta ao Gemini"* |
| **ChunkLoadError / tela preta** | `npm run dev:clean` ou `npm run dev:webpack`; não Turbopack na demo | Demo **local** gravada ou segunda aba já aquecida |
| **Login falha em produção** | `NEXTAUTH_URL`, `AUTH_SECRET`, seed demo no Neon prod | Login local gravado |
| **Integrações quebram** | Console + Network tab; corrigir `mode` / API 500 | Pular conexão ao vivo; mostrar hub já “conectado” de ensaio anterior |
| **Evolution ligado por engano** | Remover `EVOLUTION_*` da Vercel; redeploy | Reforçar narrativa “fase 2” |

---

## Fora do escopo desta entrega (Fase 2)

Não prometer nem demonstrar como se já existisse:

| Item | Por quê |
|------|---------|
| QR escaneado no celular do cliente | Requer Evolution + número real |
| Login Facebook real + página Instagram real | Requer `META_APP_ID` / OAuth Meta |
| Sara enviando mensagem no WhatsApp de forma autônoma | Outbound real + política de envio (fase 2) |
| Switch **“Ativar IA”** desligando o pipeline | Hoje só persiste config; não desliga automações |

Se perguntarem: *"Está no roadmap da Fase 2; nesta entrega validamos o CRM e a experiência da Sara como copiloto."*

---

## Checklist pré-voo (1 página)

```
[ ] Produção abre e login demo OK
[ ] 15 min navegação sem ChunkLoadError
[ ] 2+ ações IA na inbox (não mock óbvio)
[ ] WA + IG conectam (demo), console limpo
[ ] 3 respostas difíceis ensaiadas
[ ] Credenciais no canal seguro (não e-mail plano)
[ ] EVOLUTION_* ausente na Vercel
[ ] Aba apresentador limpa (só CRM + roteiro ETAPA 5)
```

---

## Referências

- Roteiro e FAQ: [ETAPA-5-PACOTE-ENTREGA.md](./ETAPA-5-PACOTE-ENTREGA.md)
- Validação sem Evolution: [ENTREGA-SEM-EVOLUTION.md](./ENTREGA-SEM-EVOLUTION.md)
- Dev lento / ChunkLoad: [GUIA-DE-TESTES.md](../GUIA-DE-TESTES.md) (seção performance `/mnt/hd`)
