# ETAPA 5 — Pacote de entrega ao contratante

> **Tempo estimado:** 1h30 · **Uso:** reunião de demonstração (15–20 min) + entrega formal dos acessos.  
> **Projeto Vercel:** `crm-plus-kappa` (`.vercel/project.json`)  
> **Antes da call (30 min):** [ETAPA-6-GO-NO-GO.md](./ETAPA-6-GO-NO-GO.md)

---

## 5.1 — Materiais para o contratante

### Checklist de entrega

- [ ] **URL de produção** enviada (abaixo)
- [ ] **Credenciais demo** enviadas por **canal seguro** (modelo na seção seguinte — nunca em e-mail em texto claro)
- [ ] **Parágrafo de escopo** incluído no e-mail / contrato / ata da reunião
- [ ] Confirmar que `NEXTAUTH_URL` na Vercel = URL de produção (sem barra final)
- [ ] Confirmar que **não** há `EVOLUTION_*` na Vercel nesta fase (modo demo de WhatsApp)
- [ ] (Opcional) Rodar seed demo em produção: `POST /api/demo/seed` ou `npm run db:seed` no ambiente Neon de produção

---

### URL de produção

| Item | Valor |
|------|--------|
| **Aplicação** | https://crm-plus-kappa.vercel.app |
| **Login direto (demo)** | https://crm-plus-kappa.vercel.app/login?demo=1 |
| **Integrações** | https://crm-plus-kappa.vercel.app/settings/integrations |
| **Inbox** | https://crm-plus-kappa.vercel.app/inbox |
| **Health (interno)** | https://crm-plus-kappa.vercel.app/api/health |

---

### Credenciais da conta demo

**Não coloque senhas neste documento nem em e-mail sem criptografia.** Use WhatsApp (conta verificada), 1Password / Bitwarden (link compartilhado), ou documento com senha de abertura.

#### Conta recomendada para a reunião (`demo-crmplus`)

| Campo | Valor |
|-------|--------|
| E-mail | `demo@crmplus.com.br` |
| Senha | *(enviar por canal seguro — padrão do seed: ver `lib/demo/seed.ts`)* |
| Atalho | `/login?demo=1` |

> Se o tenant demo ainda não existir em produção, execute o seed uma vez (`npm run db:seed` no Neon de prod ou `POST /api/demo/seed` conforme ambiente).

#### Conta alternativa (seed ACME — dados mais completos)

| Perfil | E-mail | Senha *(canal seguro)* |
|--------|--------|-------------------------|
| Admin | `admin@acme.com.br` | padrão seed `senha123` |
| Vendedor | `joana@acme.com.br` | padrão seed `senha123` |

---

### Modelo de mensagem segura (copiar e adaptar)

```
Assunto: Acesso demonstração — CRM PLUS

Olá,

Segue o ambiente de validação da Fase 1:

• URL: https://crm-plus-kappa.vercel.app
• Login demo: https://crm-plus-kappa.vercel.app/login?demo=1

As credenciais de acesso estão no [1Password / link seguro / anexo protegido por senha]
(enviado em mensagem separada).

Escopo desta fase:
WhatsApp e Instagram nesta entrega funcionam como protótipo de conexão.
O fluxo de mensagens reais via número próprio entra na Fase 2 com integração Evolution API.

Qualquer dúvida, estamos à disposição.
```

---

### Parágrafo de escopo desta fase

> **WhatsApp e Instagram nesta entrega funcionam como protótipo de conexão.** O fluxo de mensagens reais via número próprio entra na **Fase 2** com integração **Evolution API** (WhatsApp) e **OAuth Meta** (Instagram). Nesta fase validamos o CRM, a Sara (IA assistente), inbox, pipeline e a experiência visual de “conectar canais”.

Documentação técnica complementar: [ENTREGA-SEM-EVOLUTION.md](./ENTREGA-SEM-EVOLUTION.md) · [META-INSTAGRAM-HANDOFF.md](./META-INSTAGRAM-HANDOFF.md)

---

## 5.2 — Roteiro da reunião (15–20 min)

| Minuto | Tela | Mensagem-chave | Ação sugerida |
|--------|------|----------------|---------------|
| **0–2** | Problema (fala, sem tela ou slide) | *"O sistema alimenta o vendedor."* | Contexto: menos planilha, mais próximo passo claro |
| **2–5** | **Settings → Integrações** | QR WhatsApp + Instagram “1 clique” (**demo**) | Conectar WhatsApp → aguardar badge **Conectado (demo)**; Instagram → escolher página demo |
| **5–10** | **Inbox** + painel IA | Resumir → Detectar intenção → Sugerir resposta | Abrir conversa do seed; mostrar que a Sara **sugere**, não envia sozinha |
| **10–14** | **Oportunidades** (Kanban) | Lead qualificado → oportunidade | Arrastar card ou abrir oportunidade; mencionar tarefa / próximo passo |
| **14–18** | **Dashboard** | Métricas + atividade da IA | Destacar cards e atividade recente (se quota IA ok; senão explicar mock pontual) |
| **18–20** | Fechamento | Próximos passos: Evolution + OAuth Meta + auto-resposta | Alinhar Fase 2 e prazos; não prometer QR real nem DM automática hoje |

### Ordem de navegação (cola do apresentador)

1. Login: https://crm-plus-kappa.vercel.app/login?demo=1  
2. `/settings/integrations` — conectar WA + IG  
3. `/inbox` — IA nas mensagens  
4. `/opportunities` — pipeline  
5. `/dashboard` — métricas  
6. Perguntas → seção 5.3  

---

## 5.3 — Respostas prontas para perguntas difíceis

| Pergunta | Resposta sugerida |
|----------|-------------------|
| **"A Sara responde sozinha?"** | *"Nesta fase ela sugere a resposta; o envio automático entra na fase 2."* |
| **"Posso escanear o QR com meu celular?"** | *"O QR desta fase é protótipo de UI; o número real conecta na fase 2 com Evolution."* |
| **"Funciona com minha página do Instagram?"** | *"O OAuth real com o Meta entra na fase 2; aqui validamos a experiência de conexão."* |
| **"Já manda WhatsApp para o cliente?"** | *"Ainda não pelo seu número; validamos inbox, IA e CRM. Mensagem real = Evolution na fase 2."* |
| **"E se a IA não responder?"** | *"Depende da chave Gemini em produção; se a cota estourar, o sistema usa resposta de demonstração sem travar a tela."* |
| **"Posso redefinir senha por e-mail?"** | *"Nesta entrega o reset por e-mail não está ativo; na fase 2 integramos provedor transacional ou fluxo administrativo."* |
| **"Os dados são só demo?"** | *"Sim, ambiente de validação; na fase 2 migramos para tenant do contratante e canais reais."* |

---

## Anexo — Status interno (não ler ao contratante)

| Item | Status |
|------|--------|
| Remoção Resend (e-mail transacional) | Código local; commit/deploy se ainda não publicado |
| `RESEND_*` na Vercel | Remover se existir |
| Evolution em produção | Evitar `EVOLUTION_API_URL` nesta demo |
| Meta OAuth | `META_APP_ID` ausente → modo demo Instagram |
| Segurança demo | `/login?demo=1` expõe fluxo público — aceitável só para demo |

---

## Referências rápidas

- Validação sem Evolution: [ENTREGA-SEM-EVOLUTION.md](./ENTREGA-SEM-EVOLUTION.md)
- Deploy Neon + Vercel: [DEPLOY-NEON-VERCEL-RENDER.md](./DEPLOY-NEON-VERCEL-RENDER.md)
- Auditoria MVP: [AUDITORIA-ARQUITETURA-MVP.md](./AUDITORIA-ARQUITETURA-MVP.md)
