# CRM PLUS — Documento-fonte para apresentação e debate



## 1. Resumo executivo (o "elevator pitch")

O **CRM PLUS** é um CRM com **Inteligência Artificial nativa** voltado para a **pequena e média empresa brasileira que vende pelo WhatsApp**. A diferença central para os CRMs tradicionais é simples: em vez de ser uma planilha sofisticada que **alguém precisa alimentar**, o CRM PLUS **trabalha sozinho** — a IA lê cada conversa, qualifica o lead, cria a oportunidade no funil, move o card de etapa e até marca a venda como ganha.

Frase-síntese: **"O CRM tradicional é um arquivo que você preenche. O CRM PLUS é um assistente que preenche para você."**

Primeiro cliente real em produção: **Uala Car**, um lava jato em Fortaleza-CE.

---

## 2. O problema que ele resolve

O maior fracasso de CRM no mundo real não é tecnológico — é comportamental: **a equipe não alimenta a ferramenta.** Vendedor de PME está no WhatsApp, no corre, atendendo cliente. Ele não vai parar para:
- cadastrar o lead,
- classificar se é quente ou frio,
- escrever um resumo,
- arrastar o card no funil,
- registrar a próxima ação.

Resultado: o CRM tradicional vira um cemitério de dados desatualizados. As empresas pagam caro por Salesforce/HubSpot e usam 10% do potencial.

O CRM PLUS parte de uma premissa diferente: **se a IA faz o trabalho chato, o dado fica sempre atualizado** — porque não depende da disciplina humana.

---

## 3. Como funciona (o fluxo de IA, na prática)

A cada mensagem que um cliente manda no WhatsApp, automaticamente e em segundo plano:

1. **Qualifica o lead** — atribui uma **nota de 0 a 100** (potencial de fechamento) e uma prioridade.
2. **Detecta a intenção** — pedido de orçamento, agendamento, compra, reclamação, dúvida.
3. **Resume a conversa** — em 1–2 frases, foco comercial.
4. **Sugere a próxima ação** — ex.: "Enviar proposta com condições de pagamento".
5. **Cria a oportunidade no Kanban** — só para leads com intenção comercial clara.
6. **Move o card de etapa** — Prospecção → Qualificação → Proposta → Negociação → Fechado, conforme os sinais da conversa (com nível de confiança).
7. **Marca como ganha** — ao chegar na etapa final do funil.

Tudo isso roda em modo **"dispare e esqueça"**: a IA nunca trava o atendimento. E há **fallback gracioso** — se a IA estiver indisponível, o sistema continua funcionando.

---

## 4. Casos reais (dados de produção da Uala Car)

Estes são números reais, não hipotéticos:

- **41 conversas** de WhatsApp foram processadas pela IA real (DeepSeek).
- **7 oportunidades** foram criadas automaticamente no funil — só os leads com intenção comercial; os demais ficaram como contatos/inbox, sem poluir o Kanban.
- As notas variaram de forma **granular** (5 a 85), separando curiosos de compradores.
- Exemplo concreto: o lead **"Ronald"** (frota de carros buscando lava jato, intenção "pedido de orçamento", nota 85) foi **classificado, criado no funil e movido automaticamente de "Qualificação" para "Proposta"** pela IA, com 90% de confiança, com a justificativa: *"score 85, intenção 'quote_request' e última mensagem hoje indicam interesse em proposta"*.
- Outros leads quentes detectados: agendamento de plano recorrente, orçamento de lavagem completa, dúvida de cliente com carro vitrificado.

Antes da IA real, **100% das análises rodavam em "mock"** (genéricas, sem inteligência). Hoje, são 100% IA real — uma virada de chave que mudou a qualidade dos dados do funil.

---

## 5. Diferenciais (onde o CRM PLUS se destaca)

**1. IA nativa, não add-on.** Nos tradicionais, IA é um módulo caro à parte que normalmente só sugere texto. Aqui ela é o motor do sistema e **executa ações** (cria, move, fecha).

**2. Funil autopilotado.** O vendedor abre o sistema e o trabalho já foi feito. Ataca diretamente a dor de "ninguém alimenta o CRM".

**3. WhatsApp-first.** Canal nativo (não integração de terceiros cara). É onde a PME brasileira realmente vende.

**4. Custo radicalmente menor.** Arquitetura serverless + IA via DeepSeek (frações do custo da OpenAI). Viabiliza IA de ponta até para um lava jato de bairro.

**5. Multi-tenant com persona por cliente.** Cada empresa tem seu próprio assistente configurável (nome, tom, instruções) sem mexer no código.

**6. Pensado em português, para a realidade da PME.** Não é tradução de produto gringo enterprise.

---

## 6. Comparação com CRMs tradicionais

| Dimensão | CRM tradicional (Salesforce, HubSpot, RD, Pipedrive) | CRM PLUS |
|---|---|---|
| Qualificação de lead | Manual | IA automática (nota 0–100) |
| Movimentação no funil | Arrastar à mão | IA move sozinha |
| Fechamento | Manual | IA marca ganho ao concluir o funil |
| WhatsApp | Integração paga/limitada | Nativo, first-class |
| Papel da IA | Add-on caro/opcional | Núcleo do produto |
| Entrada de dados | Depende da disciplina da equipe | Automática a partir da conversa |
| Custo | Licença alta por usuário | Serverless + IA barata |
| Público-alvo | Genérico / enterprise | PME brasileira no WhatsApp |

---

## 7. Tecnologia (em linguagem acessível)

- **Frontend/Backend:** Next.js (React), rodando serverless na Vercel — escala automático, custo sob demanda.
- **Banco de dados:** PostgreSQL serverless (Neon) — "escala a zero" quando ocioso, barato.
- **IA:** DeepSeek (compatível com OpenAI), configurável por variável de ambiente; arquitetura permite trocar para Google Gemini ou Anthropic Claude sem reescrever o produto.
- **WhatsApp:** integrações com Z-API, Evolution Go e Meta Cloud API.
- **Automação:** tarefas agendadas (cron) para follow-up de leads e detecção de leads parados.

Ponto importante de engenharia: a IA é **desacoplada** — o "provider" de IA é plugável. Isso protege o negócio contra dependência de um único fornecedor e contra mudanças de preço.

---

## 8. Modelo de negócio / mercado

- **SaaS multi-tenant:** uma base de código serve muitos clientes, cada um isolado.
- **Mercado-alvo:** PMEs brasileiras orientadas a WhatsApp — lava jato, clínicas, estética, oficinas, pet shops, prestadores de serviço, varejo local.
- **Tese de custo:** como a infraestrutura é serverless e a IA é barata, dá para oferecer IA de ponta a um preço que a PME paga — algo inviável no modelo de licença cara por usuário dos incumbentes.

---

## 9. Limitações honestas (onde os tradicionais ainda ganham)

Para um debate equilibrado, é justo reconhecer:
- **Ecossistema/integrações:** Salesforce e HubSpot têm milhares de apps, automações de marketing, e-mail, telefonia.
- **Relatórios profundos:** dashboards e BI maduros.
- **Robustez enterprise:** escala, governança, compliance e suporte consolidado.
- **Maturidade:** o CRM PLUS é jovem, com primeiro cliente em produção.

O posicionamento vencedor **não é** brigar com a Salesforce no enterprise. É dominar o nicho **"CRM com IA que trabalha por você, para a PME brasileira do WhatsApp"**.

---

## 10. Ângulos de debate (objeções e respostas)

Material para gerar tensão/contraponto no debate em áudio:

**Objeção: "E se a IA classificar errado?"**
Resposta: a IA dá confiança e justificativa em cada decisão; o vendedor sempre pode corrigir (arrastar o card de volta). Mesmo errando às vezes, é melhor do que o cenário real do CRM tradicional, onde o dado simplesmente **não existe** porque ninguém preencheu.

**Objeção: "Depender do WhatsApp não é arriscado?"**
Resposta: é onde o cliente brasileiro está. Ignorar o WhatsApp por purismo arquitetural é perder a venda. Além disso, há múltiplos provedores (Z-API, Evolution, Meta) reduzindo a dependência de um só.

**Objeção: "Mover o funil automaticamente tira o controle do vendedor?"**
Resposta: a IA propõe e age com base em sinais e confiança; o controle final é humano. O ganho é não deixar lead quente esfriar por esquecimento.

**Objeção: "Competir com Salesforce/HubSpot é ingênuo."**
Resposta: não compete no mesmo terreno. Os incumbentes são caros e complexos para a PME. O CRM PLUS resolve a dor real da padaria/lava jato/clínica que vive no WhatsApp — um mercado que os gigantes atendem mal.

**Objeção: "IA barata (DeepSeek) é confiável para produção?"**
Resposta: a arquitetura é plugável — dá para trocar de provedor em minutos. A escolha por DeepSeek é estratégica de custo, não amarra técnica. E há fallback para nunca quebrar o atendimento.

**Provocação para o debate:** *o futuro do CRM é "software que você opera" ou "agente que opera por você"?* O CRM PLUS aposta na segunda visão.

---

## 11. Mensagens-chave para fechar

- "CRM que se preenche sozinho."
- "Seu funil de vendas no piloto automático."
- "IA de ponta no preço da PME."
- "Feito para quem vende no WhatsApp."
- "O dado certo, sempre atualizado — sem depender de ninguém digitar."
