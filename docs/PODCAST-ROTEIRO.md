# Roteiro para Podcast — CRM PLUS

**Fonte de conhecimento para NotebookLM**  
Ronald, desenvolvedor solo, construiu o CRM PLUS para pequenas empresas brasileiras que vendem pelo WhatsApp. Este documento explica o produto em profundidade — para apresentações a contratantes, vendas e treinamento interno.

**Cliente de referência:** Uala Car — lava jato em Fortaleza.  
**Produção:** https://crm-plus-kappa.vercel.app  
**Stack resumida:** Next.js, PostgreSQL (Neon), IA integrada, WhatsApp via Z-API (Uala Car) ou Evolution GO (novos clientes).

---

## Índice

1. [Episódio 1 — O problema que o CRM PLUS resolve](#episódio-1--o-problema-que-o-crm-plus-resolve)
2. [Episódio 2 — Como a IA trabalha nos bastidores](#episódio-2--como-a-ia-trabalha-nos-bastidores)
3. [Episódio 3 — O dashboard que fala com o vendedor](#episódio-3--o-dashboard-que-fala-com-o-vendedor)
4. [Episódio 4 — A jornada completa de um lead](#episódio-4--a-jornada-completa-de-um-lead)
5. [Episódio 5 — Integrações e como o sistema se conecta](#episódio-5--integrações-e-como-o-sistema-se-conecta)
6. [Episódio 6 — Perguntas que o contratante vai fazer](#episódio-6--perguntas-que-o-contratante-vai-fazer)
7. [Episódio 7 — O que vem a seguir (roadmap)](#episódio-7--o-que-vem-a-seguir-roadmap)
8. [Como usar este documento no NotebookLM](#como-usar-este-documento-no-notebooklm)

---

## Episódio 1 — O problema que o CRM PLUS resolve

### Contexto do episódio

Este episódio responde à pergunta mais básica e mais importante: **por que alguém pagaria por mais um sistema**, quando já existe planilha, caderno e WhatsApp no celular? A resposta não está na tecnologia — está no comportamento humano do vendedor e do dono de negócio.

### Por que CRMs tradicionais falham para pequenas empresas

CRMs clássicos — Salesforce, Pipedrive, HubSpot — nasceram para empresas com equipe de vendas dedicada, processo formal e alguém cujo trabalho é **alimentar o sistema**. Para o dono de um lava jato, uma concessionária de bairro ou uma clínica com três atendentes, o CRM vira mais uma obrigação:

- **Cadastro manual:** cada contato, cada conversa, cada etapa do funil exige cliques que ninguem tem tempo de fazer no meio do rush do WhatsApp.
- **Desconexão do canal real:** no Brasil, 90% das conversas comerciais acontecem no WhatsApp. O CRM fica numa aba que ninguém abre.
- **Funil vazio:** o pipeline existe na teoria, mas na prática está desatualizado — o vendedor sabe de cabeça quem é quente e quem esqueceu.
- **Custo de adoção:** treinar equipe, definir processo, punir quem não preencheu — pequenas empresas não têm gerente de CRM.

O resultado é previsível: **o sistema vira cemitério de dados**. O dono paga licença, vê dashboard zerado e conclui que "CRM não funciona para o meu negócio".

### O problema real: o vendedor que não alimenta o sistema

Ronald identificou isso construindo o CRM PLUS para clientes reais. O gargalo não é falta de ferramenta — é **falta de tempo e de hábito**. Quando chega uma mensagem "quanto custa a lavagem completa?", o atendente responde no WhatsApp e segue a vida. Ninguém abre o CRM, cria contato, registra oportunidade, define follow-up.

Isso gera três perdas concretas:

1. **Leads esquecidos** — clientes que pediram orçamento e nunca receberam retorno.
2. **Decisões no escuro** — o dono não sabe quanto dinheiro está "no funil" nem quem precisa de atenção hoje.
3. **Dependência de memória** — se o vendedor sai de férias ou sai da empresa, o histórico comercial vai embora no celular dele.

### A virada: e se a IA alimentasse o CRM automaticamente?

A pergunta que muda tudo: **e se cada mensagem do WhatsApp já entrasse organizada no sistema, com resumo, classificação e próxima ação sugerida — sem o vendedor digitar nada?**

É exatamente essa inversão que o CRM PLUS propõe:

| CRM tradicional | CRM PLUS |
|-----------------|----------|
| Humano alimenta o sistema | Sistema se alimenta das conversas |
| Vendedor decide o que registrar | IA extrai contato, intenção, score, oportunidade |
| Dashboard reflete disciplina da equipe | Dashboard reflete o que realmente aconteceu no WhatsApp |
| Funil depende de atualização manual | Funil avança com detecção de intenção comercial |

**Importante:** quem responde o cliente depende de como o negócio está configurado — existem dois cenários (detalhados abaixo). Em ambos, a IA do CRM organiza, classifica e prepara informações; a diferença está em quem fala com o cliente no WhatsApp.

### Dois modelos de atendimento (Cenário A vs Cenário B)

**CENÁRIO A — Cliente com bot próprio (ex.: Uala Car via Z-API)**  
- O **bot externo** faz o atendimento no WhatsApp (gerenciado por profissional de automação).  
- A **IA do CRM** trabalha em **segundo plano**: recebe as conversas, cria contatos automaticamente, classifica leads, calcula score e sugere próxima ação.  
- O vendedor **não precisa ler cada conversa** — o CRM já entregou o contexto mastigado (resumo, score, tarefa).  
- A IA do CRM **não responde o cliente** nesse cenário — quem responde é o bot existente ou o vendedor quando assume.

**CENÁRIO B — Cliente sem bot próprio (novos clientes via Evolution GO)**  
- O WhatsApp é conectado por **QR code direto no CRM**.  
- A **IA acompanha todas as conversas em tempo real**, classifica cada lead automaticamente e indica ao vendedor a melhor ação a tomar.  
- Quem responde o cliente é o **vendedor, pelo Inbox** — com o resumo, a classificação e a próxima ação já prontos pela IA.  
- O **atendimento automático completo pela IA** é uma funcionalidade em desenvolvimento para a próxima versão do sistema.

### Como o CRM PLUS inverte essa lógica na prática

Quando a IA está ligada em **Integrações → Agente de Inteligência Artificial**, cada mensagem recebida dispara um pipeline automático:

1. **Contato criado ou atualizado** pelo telefone do WhatsApp.
2. **Conversa registrada** no Inbox unificado.
3. **Resumo gerado** em uma ou duas frases comerciais.
4. **Lead classificado** com score de 0 a 100 e tags como "orçamento", "quente", "urgente".
5. **Oportunidade aberta** no funil quando há intenção comercial clara.
6. **Tarefa criada** com prazo — por exemplo, "Enviar proposta com condições de pagamento" com vencimento em 4 horas se for urgente.

O vendedor abre o sistema e encontra **contexto pronto**, não formulário em branco.

### Exemplo concreto: lava jato Uala Car — o que mudou no dia a dia

Imagine a Uala Car em Fortaleza. Antes do CRM PLUS:

- Dezenas de mensagens por dia: "vocês abrem sábado?", "quanto custa a premium?", "quero agendar".
- Tudo no WhatsApp do celular da recepção.
- Cliente que pediu orçamento na terça some até sexta porque ninguém lembrou de retornar.
- O dono não sabe quantos negócios estavam "quase fechando".

Depois do CRM PLUS (Cenário A — bot externo + CRM em paralelo):

- **Manhã:** o dono abre o Dashboard e vê "3 leads quentes", "2 conversas sem resposta", "Receita prevista: R$ 4.200" (soma das oportunidades abertas).
- **Cliente manda:** "Quanto custa a lavagem premium do meu SUV?" — o **bot da Uala Car responde** no WhatsApp como sempre; em paralelo, em segundos o CRM cria contato, resume a conversa, detecta intenção de orçamento, atribui lead score 72 (morno/quente), abre oportunidade na etapa "Proposta" e cria tarefa de alta prioridade.
- **Vendedor:** abre o Inbox (`/inbox`), lê o resumo mastigado e a nextBestAction — **sem precisar ler cada troca do bot**. Quando o lead esquenta, assume com contexto completo (sugestão de resposta da IA, se quiser).
- **Fim do mês:** oportunidades marcadas como "Ganha" alimentam a receita realizada no Dashboard e os relatórios.

A Uala Car não precisou substituir o bot que já funcionava nem contratar alguém para "cuidar do CRM". O CRM passou a cuidar dela em segundo plano.

### Números e referências do sistema

- **Lead score:** escala de 0 a 100 no contato.
  - 70–100 = quente (vermelho)
  - 35–69 = morno (amarelo)
  - 0–34 = frio (azul)
- **Prioridade do inbox:** score de prioridade 70+ significa "responder hoje".
- **Papéis de equipe suportados:** Owner, Gestor, Vendedor, Atendente, Financeiro, Visualizador — cada um com permissões diferentes.

### Tom sugerido para os apresentadores

Um apresentador leigo pergunta: "Mas eu já uso WhatsApp, por que preciso de mais um sistema?" O apresentador técnico explica a inversão — o CRM que se alimenta sozinho — usando a analogia do lava jato.

---

## Episódio 2 — Como a IA trabalha nos bastidores

### Contexto do episódio

Este episódio tira o véu do que acontece **nos primeiros segundos** depois que o cliente manda uma mensagem. Sem código, sem jargão — mas com precisão sobre o que o sistema realmente faz.

### Dois cenários, um pipeline de inteligência

O processamento da IA no CRM é o **mesmo nos dois modelos** — resumo, classificação, score, oportunidade, tarefa. O que muda é **quem responde o cliente no WhatsApp**:

| | Cenário A (Uala Car + bot) | Cenário B (Evolution GO) |
|---|---------------------------|--------------------------|
| Quem fala com o cliente | Bot externo (ou vendedor ao assumir) | Vendedor pelo Inbox (com apoio da IA) |
| Papel da IA do CRM | Segundo plano — organiza e classifica | Acompanha em tempo real, classifica e sugere a próxima ação |
| Vendedor entra quando | Lead quente ou exceção | Lead pronto para fechar |

Nos exemplos abaixo usamos a **Uala Car (Cenário A)** — a IA do CRM **não envia mensagem ao cliente**; ela processa o que o bot e o cliente trocaram.

### Os primeiros 3 segundos após uma mensagem chegar

Quando João manda "Olá, preciso de um orçamento" no WhatsApp da Uala Car, uma sequência rápida começa:

**Segundo 0–1 — A campainha toca (webhook)**  
O WhatsApp não "empurra" mensagens direto para o CRM. Existe um intermediário — a Z-API (no caso da Uala Car) ou o Evolution GO (para novos clientes). Quando a mensagem chega, esse serviço bate na porta do CRM: "ei, chegou mensagem nova". Isso é o **webhook** — como a campainha da casa: alguém tocou, o sistema acorda.

**Segundo 1–2 — Identificação e registro**  
O CRM verifica qual empresa (tenant) aquela mensagem pertence — pela instância Z-API cadastrada. Depois:

- Busca contato pelo telefone (+55...) ou cria um novo como "lead".
- Abre ou localiza conversa aberta no canal WhatsApp.
- Salva a mensagem com data, direção (recebida) e ID externo (para não processar duplicata).
- Registra log de auditoria: "webhook recebido".

**Segundo 2–3 — IA entra em cena (em paralelo)**  
Se a IA está ativa e a mensagem veio do cliente (não do próprio aparelho), duas ações rodam ao mesmo tempo:

1. **Resumir conversa** — lê até as 10 mensagens mais recentes e gera resumo comercial + pontos-chave.
2. **Classificar lead** — analisa mensagem, histórico, dados do contato e retorna qualificação estratégica completa.

Tudo isso acontece em **segundo plano** — no Cenário A o bot externo segue atendendo João no WhatsApp enquanto o CRM organiza; no Cenário B o vendedor responde pelo Inbox, apoiado pela classificação e pelas sugestões da IA. Em ambos, o vendedor vê o resultado mastigado quando abrir o Inbox.

### Como o webhook funciona (analogia da campainha)

Pense na Uala Car como uma casa comercial:

- **WhatsApp** = rua onde os clientes batem na porta.
- **Z-API / Evolution GO** = porteiro que recebe a visita e avisa dentro.
- **Webhook** = campainha conectada ao CRM — cada toque é um aviso instantâneo.
- **CRM PLUS** = sala de controle onde tudo fica registrado.

O dono do lava jato nunca configura webhook no dia a dia. Na implantação, Ronald cadastra a instância, o token de segurança e o endereço de recebimento. Depois disso, funciona sozinho.

**Segurança:** mensagens Z-API exigem token de autenticação. Meta Cloud API exige assinatura criptográfica. Mensagens duplicadas (mesmo ID) são ignoradas — idempotência.

**Resiliência:** cada webhook é logado. Se o processamento falhar, há retry automático (até 2 tentativas) antes de marcar como falha para auditoria.

### Como a IA lê a conversa e extrai informações

A IA não "adivinha" — ela recebe contexto estruturado:

- Nome, telefone, e-mail do contato.
- Se já existe oportunidade aberta.
- Última mensagem do cliente.
- Histórico das últimas 10 mensagens, marcadas como [cliente] ou [atendente].
- Instruções personalizadas do negócio (ex.: "Somos a Uala Car, lava jato em Fortaleza...").

Com isso, executa ações especializadas:

| Ação | O que produz |
|------|--------------|
| **Resumir conversa** | Texto de 1–2 frases + até 5 pontos-chave (orçamento, urgência, reclamação...) |
| **Classificar lead** | Score, intenção, urgência, tags, próxima ação, se abre oportunidade |
| **Detectar intenção** | Classificação fina: interesse, dúvida, reclamação, orçamento, urgência, perda de interesse |
| **Sugerir resposta** | Texto pronto para o vendedor revisar e enviar pelo Inbox (Cenário A e B). O envio automático pela IA é uma funcionalidade em desenvolvimento. |
| **Criar tarefa** | Compromissos explícitos extraídos da conversa ("mando proposta amanhã") |
| **Detectar leads parados** | Contatos sem oportunidade há 3+ dias; negócios parados há 7+ dias |

Todas as ações geram registro em **AiLog** — auditoria completa do que a IA fez, quando e com qual resultado.

### O que é lead score e como é calculado

**Lead score** = temperatura do lead, numa escala de **0 a 100**.

A IA considera:

- **Conteúdo da mensagem** — palavras como "orçamento", "quero comprar", "agendar" elevam o score.
- **Intenção detectada** — pedido de preço pesa mais que curiosidade genérica.
- **Sinal de budget** — alto, médio, baixo ou desconhecido.
- **Dados do contato** — telefone (+10), e-mail corporativo (+10), empresa vinculada (+8), oportunidade existente (+15).
- **Urgência** — prazo, "hoje", "urgente" aumentam prioridade.

**Faixas práticas:**

| Score | Classificação | Cor no sistema | Significado |
|-------|---------------|----------------|-------------|
| 70–100 | Quente | Vermelho | Alta chance de fechamento — priorizar hoje |
| 35–69 | Morno | Amarelo | Interesse médio — nutrir nos próximos dias |
| 0–34 | Frio | Azul | Pouco sinal comercial — follow-up de baixa prioridade |

Exemplo numérico real do motor de classificação:

- "Quanto custa a lavagem?" → score ~72, tags "orçamento" + "quente", oportunidade criada.
- "Quero comprar o pacote mensal" → score ~88, intent "purchase", etapa "Negociação".
- "Vocês abrem sábado?" → score ~15–45, intent "information", sem oportunidade automática.

### Classificação de intenção — exemplos reais (Uala Car)

A IA diferencia mensagens que parecem parecidas mas exigem respostas comerciais diferentes:

**"Quero lavar meu carro"**  
- Intenção: **scheduling** (agendamento) ou **information** (informação), dependendo do contexto.
- Score moderado (~58).
- Próxima ação: "Confirmar horário da visita/reunião".
- Oportunidade: criada se houver interesse real de agendar serviço pago.

**"Quanto custa a lavagem?"**  
- Intenção: **quote_request** (pedido de orçamento).
- Score alto (~72), urgência alta.
- Próxima ação: "Enviar proposta com condições de pagamento".
- Oportunidade: criada na etapa "Proposta".
- Tarefa: alta prioridade, vencimento em ~4 horas.

**"Meu carro ficou arranhado depois da lavagem de vocês"**  
- Intenção: **complaint** (reclamação).
- Score comercial médio (~40), mas **prioridade altíssima** (~85) — reclamação não é lead quente, é incêndio.
- Próxima ação: "Ligar hoje e resolver a reclamação".
- Tom da sugestão de resposta: empático, não comercial.

Analogia: é como um atendente experiente que **conhece os clientes** — sabe que reclamação vem antes de venda, que orçamento é oportunidade, que "só quero saber o horário" pode ser curiosidade ou cliente decidido.

### O que é nextBestAction — como a IA decide a próxima ação

**nextBestAction** = a instrução concreta que aparece na conversa para o vendedor. Não é genérico "entre em contato" — é específico:

- "Enviar proposta com condições de pagamento"
- "Confirmar fechamento e enviar contrato/link"
- "Ligar hoje e resolver a reclamação"
- "Retomar contato e qualificar necessidade"

A decisão combina:

1. **Intenção** principal.
2. **Urgência** (alta/média/baixa).
3. **Etapa sugerida** no funil (Lead → Qualificação → Proposta → Negociação → Fechamento).
4. **Se já existe oportunidade** — evita duplicar negócio aberto.

Quando aplicável, a nextBestAction vira **tarefa automática** com prazo:

- Urgência alta → vence em **4 horas**
- Urgência média → **24 horas**
- Urgência baixa → **72 horas**

### Detecção de leads parados (gargalos)

Além do fluxo em tempo real, o Dashboard executa análise periódica:

- **Contatos** marcados como lead, sem oportunidade, parados **3+ dias** → tarefa "Lead sem contato".
- **Oportunidades abertas** sem movimentação **7+ dias** → tarefa "Gargalo" com ação recomendada pela IA.
- Parados **14+ dias** → urgência alta.

Isso aparece na seção **"Gargalos detectados pela IA"** do Dashboard — até 5 itens com dias parados e ação sugerida.

### Tom sugerido para os apresentadores

Apresentador leigo: "Mas a IA lê todas as minhas conversas?" Técnico explica que sim, mas só para organizar — como terceirizar a secretária, não o vendedor. Use a analogia da campainha e da temperatura do lead.

---

## Episódio 3 — O dashboard que fala com o vendedor

### Contexto do episódio

O Dashboard é a **primeira tela** após o login — a central de comando comercial. Este episódio ensina o vendedor (e o contratante) a ler cada card e entender por que um CRM inteligente é diferente de uma planilha bonita.

### O que o vendedor vê quando abre o sistema

Saudação personalizada: "Bom dia, [nome]" + "Aqui está o resumo do seu dia comercial."

A tela se organiza em camadas:

1. **Cards de KPI** (duas fileiras de métricas clicáveis).
2. **Gargalos detectados pela IA** (se houver leads parados).
3. **Funil de vendas** + **Ações da IA hoje** (lado a lado).
4. **Tarefas prioritárias** (até 5 de alta prioridade).

Cada card é um link — clicou em "Leads quentes", vai para Oportunidades; clicou em "Conversas sem resposta", vai para o Inbox.

### Como ler os cards principais

**Fileira superior — visão estratégica:**

| Card | O que mostra | Para que serve |
|------|--------------|----------------|
| **Oportunidades abertas** | Quantidade de negócios em andamento | Saber tamanho do funil ativo |
| **Receita prevista** | Soma em R$ das oportunidades abertas | Quanto dinheiro está "na mesa" |
| **Receita realizada** | Valor recebido no mês corrente | Performance real vs. expectativa |
| **Leads quentes** | Oportunidades abertas cujo contato tem intenção de interesse, orçamento ou urgência detectada | Quem atender primeiro |

**Fileira inferior — operação do dia:**

| Card | O que mostra | Alerta visual |
|------|--------------|---------------|
| **Tarefas para hoje** | Pendências com prazo até hoje + total pendente | Laranja se > 0 |
| **Tarefas atrasadas** | Prazo já vencido | Vermelho se > 0 |
| **Cobranças pendentes** | Pagamentos aguardando | Link para Faturamento |
| **Conversas sem resposta** | Conversas abertas cuja última mensagem veio do cliente | Vermelho — cliente esperando |

### O que "IA ativa" significa na prática

No menu lateral aparece **"IA ativa"** com indicador verde quando o tenant tem inteligência artificial integrada.

Mas verde no menu ≠ IA trabalhando. Para a IA **operar de verdade**:

1. Ir em **Integrações → Agente de Inteligência Artificial**.
2. Ligar o agente.
3. Configurar nome (ex.: "Sara"), tom (profissional, amigável, empático, direto).
4. Escrever instruções do negócio.
5. Testar com simulação antes de salvar.

**Com IA ligada:** cada mensagem inbound dispara resumo + classificação + tarefas + oportunidades automáticas.

**Com IA desligada:** CRM funciona normalmente — contatos, conversas, funil manual — mas sem análises automáticas. É como ter a campainha funcionando, mas sem secretária.

### Como a fila de ações prioriza o tempo do vendedor

O CRM PLUS não lista conversas por ordem de chegada cega. Usa **priorityScore** (0–100) na conversa:

- **70+** = responder hoje.
- Combina urgência + intenção + sinal de budget.

No Inbox, filtros ajudam:

- **Prioridade alta / Todas**
- **Abertas, Pendentes, Resolvidas**
- **Canal** — WhatsApp, Instagram, e-mail, manual

Badges visuais: Orçamento, Interesse, Urgência — derivados da intenção detectada.

**Tarefas prioritárias** no Dashboard mostram até 5 itens de alta prioridade, com ícone de robô quando criadas pela IA. Tarefas atrasadas aparecem em vermelho com ícone de relógio.

**Rotina sugerida para o vendedor:**

1. Manhã: Dashboard → tarefas atrasadas + conversas sem resposta.
2. Atender leads quentes primeiro (score 70+ ou badge de orçamento).
3. Ler resumo + nextBestAction antes de responder.
4. Usar sugestão de resposta da IA, personalizar, enviar.
5. Mover oportunidade no Kanban conforme avanço.

### Diferença entre CRM tradicional e CRM inteligente na prática

**Cenário:** sexta-feira, 9h, 15 mensagens acumuladas desde ontem.

| CRM tradicional | CRM PLUS |
|-----------------|----------|
| Vendedor abre WhatsApp, lê uma por uma | Dashboard mostra "4 conversas sem resposta" e "2 leads quentes" |
| Não sabe quem pediu orçamento | Badge "Orçamento" + resumo pronto |
| Esquece follow-up de terça | Tarefa "Enviar proposta" criada automaticamente com prazo |
| Dono pergunta "quanto vamos faturar?" — silêncio | Receita prevista: R$ X na tela |
| Funil desatualizado | Oportunidade criada na etapa certa pela IA |

**Seção "Ações da IA hoje":** mostra até 8 registros do dia — "Classificou lead", "Resumiu conversa", "Detectou intenção", "Sugeriu resposta" — com horário. Transparência: o contratante vê que a IA está trabalhando, não só prometida.

**Funil de vendas visual:** barras por etapa (Lead, Qualificação, Proposta...) com quantidade de oportunidades e valor em R$ por coluna. Gargalos ficam visíveis — muitos negócios parados em "Proposta" = problema de follow-up.

### Módulos do menu (visão completa)

| Área | Rota | Função |
|------|------|--------|
| Dashboard | /dashboard | Resumo do dia |
| Conversas | /inbox | Inbox unificado |
| Oportunidades | /opportunities | Kanban e lista de negócios |
| Contatos | /contacts | Cadastro e lead score |
| Central de Tarefas | /tasks | Pendências e follow-ups |
| Faturamento | /billing | Cobranças |
| Pipeline | /pipeline | Configurar etapas do funil |
| Relatórios | /reports | Vendas por mês, produto, vendedor |
| Produtos | /products | Catálogo de serviços |
| Equipe | /team | Membros e papéis |
| Integrações | /settings/integrations | WhatsApp, Instagram, IA |
| Configurações | /settings | Empresa, importação CSV (exportação em massa: versão futura) |

### Tom sugerido para os apresentadores

Leigo: "Parece muita informação." Técnico: "É justamente o oposto — em vez de 50 conversas soltas no WhatsApp, são 4 números que dizem o que fazer agora."

---

## Episódio 4 — A jornada completa de um lead

### Contexto do episódio

Narrativa minuto a minuto de um cliente real — do WhatsApp ao fechamento — para o contratante visualizar o ROI operacional.

### Personagem e cenário

**Cliente:** Maria, dona de um Corolla prata.  
**Empresa:** Uala Car, lava jato em Fortaleza.  
**Mensagem inicial:** "Oi, quanto custa a lavagem premium do SUV? Queria fazer essa semana."

### Minuto 0 — Ponto de partida: mensagem no WhatsApp

Maria manda mensagem no número comercial da Uala Car — o mesmo que ela já conhece. Ela não sabe que existe CRM; ela só quer preço.

Por trás:

1. Z-API recebe a mensagem da instância conectada.
2. Webhook POST chega ao CRM PLUS com telefone, nome, texto, ID da mensagem.
3. Token de segurança validado; tenant Uala Car identificado pela instância.

### Minuto 1 — Contato criado automaticamente

O sistema:

- Normaliza telefone para formato internacional (+5585...).
- Busca contato existente — não encontra.
- Cria **Maria** como contato com status **lead**.
- Abre conversa "WhatsApp — Maria" com status **aberta**.
- Salva mensagem como **inbound** (recebida).
- Emite evento de automação (contato criado, conversa criada).

**O que o vendedor veria:** nova conversa aparece no Inbox. Sem digitar nada.

### Minuto 2 — IA resume a conversa e detecta intenção

Pipeline de IA dispara (se agente ligado):

**Resumo (summarizeConversation):**  
"Cliente solicita preço da lavagem premium para SUV e quer agendar ainda esta semana."

**Pontos-chave:**
- Cliente solicitou informações de preço/orçamento
- Cliente demonstra urgência (esta semana)
- Interesse de compra detectado

**Classificação (classifyLead):**

| Campo | Valor |
|-------|-------|
| Intent | quote_request |
| Urgency | high |
| Lead score | ~72 |
| Classification | quente (hot) |
| Priority score | ~78 |
| Tags | orçamento, quente |
| createOpportunity | true |
| suggestedStage | proposal |
| nextBestAction | Enviar proposta com condições de pagamento |

Conversa atualizada com: summaryText, detectedIntent, priorityScore, nextBestAction.

### Minuto 3 — Lead score calculado e oportunidade criada

- Contato recebe **leadScore 78** (prioridade para ordenação).
- Tags "orçamento" e "quente" aplicadas (se existirem no tenant).
- **Oportunidade criada:** "Maria — Cliente solicita preço da lavagem premium..."
  - Pipeline padrão da Uala Car.
  - Etapa "Proposta" (match automático por nome da etapa).
  - Status: aberta.
- **Tarefa criada pela IA:**
  - Título: "Enviar proposta com condições de pagamento"
  - Prioridade: alta
  - Vencimento: ~4 horas (urgência alta)
  - Origem: robô (source: ai)
- **AiLog registrado:** classify_lead + summarize_conversation.

Dashboard atualiza:

- Oportunidades abertas: +1
- Leads quentes: +1 (intenção quote_request)
- Receita prevista: + valor quando vendedor preencher

### Minuto 5 — Vendedor recebe alerta de lead quente

Carlos, atendente da Uala Car, abre o CRM no notebook:

1. Dashboard mostra **Leads quentes: 1** (destaque laranja).
2. **Conversas sem resposta: 1** (vermelho).
3. Tarefa prioritária: "Enviar proposta..." com ícone de robô, vencimento hoje.

Carlos clica em **Conversas** (Inbox, `/inbox`). Maria aparece no topo (priorityScore 78). Badges: **Orçamento**.

Ele lê em 10 segundos o que antes levaria 3 minutos rolando WhatsApp:

- Resumo completo.
- Próxima ação sugerida.
- Lead score 78 — quente.

### Minuto 10 — Vendedor age com contexto completo

Carlos abre o **Painel de IA** (ícone de robô):

- Clica **Sugerir resposta**.
- IA retorna tom profissional (~85% confiança):  
  "Olá, Maria! Obrigado pelo interesse. A lavagem premium para SUV está em R$ X. Temos horários esta semana — prefere sábado de manhã ou tarde?"

Carlos ajusta o valor real, personaliza, clica **Enviar**. Mensagem sai pelo WhatsApp conectado — registrada no CRM como outbound.

Maria responde: "Sábado de manhã serve. Pode ser 9h?"

Nova mensagem → webhook → IA atualiza resumo → intent vira **scheduling** → nextBestAction: "Confirmar horário da visita".

Carlos confirma, move oportunidade para **Agendado** no Kanban.

### Resultado — tempo de resposta e qualidade da abordagem

**Antes do CRM PLUS:**

- Tempo médio de primeira resposta: 2–4 horas (mensagem perdida no meio de outras).
- Qualidade: genérica — "Oi, qual serviço?" sem saber que ela pediu premium SUV.
- Follow-up: dependia de memória.
- Visibilidade do dono: zero.

**Depois:**

- Primeira resposta: **~10 minutos** com contexto completo.
- Qualidade: personalizada, menciona serviço certo, oferece horário.
- Follow-up: tarefa automática se Maria sumir 3+ dias.
- Dono vê: +1 oportunidade, lead quente, receita prevista atualizada.

**Se Maria some 5 dias:** detectStalledLeads cria gargalo — "Oportunidade na etapa Agendado sem movimentação há 5 dias" com ação recomendada pela IA.

**Se Maria fecha:** Carlos marca oportunidade como **Ganha**, informa valor → entra em receita realizada do mês + relatórios.

### Tom sugerido para os apresentadores

Contar como história em terceira pessoa — "Maria nem imagina que enquanto ela manda oi, um robô silencioso já organizou tudo para o Carlos brilhar no atendimento."

---

## Episódio 5 — Integrações e como o sistema se conecta

### Contexto do episódio

Contratantes perguntam: "Como isso se conecta ao meu WhatsApp? Preciso trocar de número? Vai cair?" Este episódio explica a arquitetura em linguagem de negócio.

### O que é a Z-API e por que foi escolhida para a Uala Car

A **Z-API** é um serviço brasileiro que conecta WhatsApp ao mundo externo via API. Funciona como **ponte** entre o aplicativo WhatsApp Business da Uala Car e sistemas externos.

**Contexto real da Uala Car (Cenário A):**

A Uala Car **já tinha um chatbot funcionando** no WhatsApp, gerenciado por um profissional de automação. Em vez de substituir o que funcionava, o CRM foi **integrado em paralelo via middleware** — um serviço intermediário que recebe as mensagens da Z-API e repassa para o CRM **sem interferir no bot existente**.

**Resultado:** o bot continua atendendo normalmente, e o CRM inteligente trabalha em **segundo plano** — organizando, classificando e preparando as informações para o vendedor tomar a melhor decisão.

**Por que Z-API na Uala Car:**

- Implantação em paralelo — instância + token + webhook, sem desligar o bot.
- Ecossistema maduro no Brasil, documentação em português.
- Suporte a webhook com autenticação por token.
- Identificação da instância (`instanceId`) permite rotear mensagens para o tenant correto.

**Fluxo Z-API:**

1. Cliente manda mensagem → Z-API captura.
2. Z-API envia JSON para `/api/webhooks/whatsapp`.
3. CRM parseia: telefone, nome, texto, messageId, timestamp.
4. Ignora grupos e mensagens sem texto (por enquanto).
5. Processa via `ingestWebhook` com log e retry.

**Dados que chegam:** phone, senderName, message/body, messageId, fromMe (se foi enviada pelo próprio aparelho), timestamp.

### Como o middleware funciona (analogia simples)

Pense num **correio inteligente** entre a rua e a sala de controle:

```
Cliente → WhatsApp → [Z-API ou Evolution GO] → Webhook → CRM PLUS → Inbox + IA
                              ↑
                    "Middleware" — não é o CRM,
                    é quem traduz WhatsApp para o sistema
```

**Funções do middleware:**

- Manter sessão WhatsApp conectada.
- Traduzir mensagens para formato que o CRM entende.
- Entregar webhooks instantaneamente.
- Permitir envio de respostas via API (quando vendedor clica Enviar no Inbox).

**Analogia da campainha (reprise):** o middleware toca a campainha; o CRM atende a porta e registra quem chegou.

**Segurança no caminho:**

- Rate limit no endpoint de webhook (proteção contra flood).
- Verificação de token Z-API ou assinatura Meta.
- Logs em `webhook_logs` — received, processed, failed.
- Idempotência — mesma messageId não processa duas vezes.

### Por que o WhatsApp é o canal central no Brasil

- Onde o cliente já está — não precisa baixar app novo.
- Conversas informais combinam com vendas locais (lava jato, oficina, clínica).
- Áudio, foto, localização — tudo num lugar (expansão futura de tipos de mídia).
- Confiança — número conhecido da empresa.

O CRM PLUS trata WhatsApp como **canal primário**, com Instagram e e-mail como complementos na arquitetura (ConversationChannel: whatsapp, instagram, email, manual).

### O papel do Evolution GO para novos clientes (Cenário B)

Para **novos clientes sem bot próprio** (não Uala Car), o CRM PLUS oferece integração via **Evolution GO** — **Cenário B**, em que a IA **acompanha as conversas em tempo real, classifica cada lead e indica a próxima ação** ao vendedor:

1. Integrações → WhatsApp → Conectar.
2. Escanear **QR Code** (WhatsApp → Aparelhos conectados).
3. Status **Conectado** com número exibido.
4. Webhook registrado automaticamente na instância.
5. Cron de health check reconcilia estado da conexão.
6. IA classifica o lead e sugere a próxima ação; o **vendedor responde pelo Inbox** e recebe alerta quando o lead esquenta. O atendimento automático completo pela IA é uma funcionalidade em desenvolvimento para a próxima versão.

**Vantagens Evolution GO:**

- Self-service — cliente conecta sem depender de terceiro pago nem de bot externo.
- QR Code oficial gerado pelo Evolution (não recriação).
- Classificação e sugestões da IA em tempo real (atendimento automático completo: em desenvolvimento).
- Simulação disponível para demo (`isEvolutionGoSimulated`).

**Quando usar qual:**

| Cenário | Integração |
|---------|------------|
| Uala Car (produção atual) | Z-API |
| Novo cliente self-service | Evolution GO |
| Meta Cloud API (escala enterprise) | Suportado no mesmo endpoint |

O sistema detecta automaticamente o formato do payload (Meta vs Z-API) no mesmo webhook.

### Modo demonstração vs modo real

**Modo real:**

- WhatsApp conectado (Z-API ou Evolution).
- Mensagens de clientes reais entram no Inbox.
- IA analisa conversas reais.
- Webhook autenticado em produção.

**Modo demonstração:**

- Tenant com slug `demo-crmplus` vê **Roteiro de demonstração** no Dashboard.
- Badge **Demo** / **Modo demo** nas integrações.
- Evolution simulado — QR e conexão fake para treino.
- Dados de exemplo para mostrar fluxo completo sem risco.

**Roteiro demo (5 passos no Dashboard):**

1. Conversas — detectar intenção com IA.
2. Oportunidades — mover Kanban, marcar ganho.
3. Contatos — ver histórico vinculado.
4. Faturamento — cobranças de vendas ganhas.
5. Relatórios — receita por mês, produto, vendedor.

Ideal para apresentação a contratante antes de conectar WhatsApp real.

### Outras integrações na arquitetura

- **Instagram** — webhook separado, mesmo processador inbound (`processInboundMessage` com channel instagram).
- **Meta Cloud API** — formato whatsapp_business_account, verificação hub.challenge no GET.
- **Importação CSV** — contatos e produtos via Configurações.
- **Automations** — eventos emitidos (contactCreated, conversationCreated, opportunityCreated) para fluxos futuros.

### Tom sugerido para os apresentadores

Leigo: "Vou perder meu WhatsApp?" Técnico: "Não — é o mesmo número, só ganha um cérebro por trás."

---

## Episódio 6 — Perguntas que o contratante vai fazer

### Contexto do episódio

Objeções reais de vendas — cada uma com resposta técnica, tradução simples e exemplo prático.

---

### 1. "A IA responde automaticamente meus clientes?"

**Resposta (como explicar ao contratante):**

Depende de como seu negócio está configurado. Se você **já tem um chatbot funcionando** no WhatsApp, a IA do CRM trabalha em **segundo plano** — ela organiza, classifica e prepara as informações para você agir. Se você **não tem bot**, o CRM conecta seu WhatsApp direto (Evolution GO): a IA **acompanha as conversas em tempo real, classifica cada lead e indica a melhor ação**, e o **vendedor responde pelo Inbox**. O atendimento automático completo pela IA é uma funcionalidade em desenvolvimento para a próxima versão do sistema.

**Resposta técnica:**  
- **Cenário A (Z-API + bot externo, ex.: Uala Car):** webhook alimenta o CRM; IA executa classifyLead, summarizeConversation, detectIntent em segundo plano. O bot externo responde o cliente; suggestReply apoia o vendedor se ele assumir.  
- **Cenário B (Evolution GO, sem bot):** WhatsApp conectado por QR; IA executa classifyLead, summarizeConversation, detectIntent e gera sugestões (suggestReply); o vendedor responde pelo Inbox. Resposta automática da IA: em desenvolvimento.

**Linguagem simples:** Dois caminhos — **já tem robô?** O CRM fica inteligente atrás dele. **Não tem robô?** Você conecta o WhatsApp e o CRM organiza, classifica e sugere as respostas; você envia pelo Inbox. (Resposta 100% automática vem na próxima versão.)

**Exemplo prático:**  
- **Uala Car (A):** Maria pergunta preço → bot responde no WhatsApp → CRM classifica score 72 e cria tarefa → Carlos vê resumo no Inbox e só entra se precisar fechar.  
- **Novo cliente (B):** Maria pergunta preço → IA classifica o lead e sugere a resposta → vendedor envia pelo Inbox → quando ela diz "quero fechar", recebe alerta de lead quente.

---

### 2. "Como sei que a IA não vai errar e enviar algo errado?"

**Resposta técnica:** Por design, em **ambos os cenários** suggestReply retorna JSON com suggestion + confidence — o envio fica com o bot externo (Cenário A) ou com o vendedor no Inbox (Cenário B). O envio automático de respostas pela IA é uma funcionalidade em desenvolvimento. Classificação errada pode ser corrigida manualmente (status contato, oportunidade, tarefa). Instruções customizáveis em tenant settings. AiLog audita cada ação. Simulação disponível antes de ativar.

**Linguagem simples:** No **Cenário A** (bot + CRM), quem responde é o bot ou você — a IA do CRM só organiza. No **Cenário B** (Evolution GO), você responde pelo Inbox com o apoio das sugestões e da classificação da IA. Se classificar errado, você corrige — como faria com estagiário.

**Exemplo prático:** Cliente manda "meu carro arranhou" — IA detecta reclamação, sugere tom empático, cria tarefa "Ligar hoje". No Cenário A o bot trata o primeiro contato; no Cenário B o vendedor responde pelo Inbox usando a sugestão de tom empático da IA e a tarefa de alta prioridade.

---

### 3. "O que acontece se o sistema cair?"

**Resposta técnica:** Hospedagem Vercel (serverless) com PostgreSQL Neon. Webhooks logados em `webhook_logs` — status received/processed/failed. Retry automático (2 tentativas) no ingest. Mensagens duplicadas ignoradas por externalId. Evolution health cron reconcilia WhatsApp. Z-API enfileira — mensagens podem ser reenviadas conforme política do provedor.

**Linguagem simples:** Se o CRM dormir por minutos, o WhatsApp continua recebendo. Quando voltar, o intermediário reentrega. Tudo fica registrado para não perder rastro.

**Exemplo prático:** Queda de 2 minutos na madrugada — webhook falha, retry processa quando serviço volta. Conversa aparece normalmente de manhã.

---

### 4. "Meus dados estão seguros?"

**Resposta técnica:** Multi-tenant — cada empresa (Tenant) isolada por tenantId em todas as queries. Autenticação NextAuth com sessão. Papéis (owner, manager, salesperson, attendant, financial, viewer) com permissões granulares (`can()`). Senhas hasheadas. Webhook tokens e assinaturas Meta. Dados em PostgreSQL gerenciado (Neon).

**Linguagem simples:** Sua empresa é um apartamento trancado — outro lava jato no sistema não vê seus clientes. Cada funcionário entra com login próprio.

**Exemplo prático:** Vendedor da Uala Car não acessa faturamento se papel for "Vendedor" sem permissão billing.

---

### 5. "Posso usar com minha equipe de vendas?"

**Resposta técnica:** Sim. Model User com roles: owner, manager, salesperson, attendant, financial, viewer. Convite por e-mail/senha. Tarefas assignáveis. Conversas assignáveis. Relatórios por vendedor. Permissões por módulo (tasks, opportunities, conversations, billing).

**Linguagem simples:** Cada um tem login. Dono vê tudo; vendedor vê clientes; financeiro vê cobranças.

**Exemplo prático:** Uala Car — dono (owner), recepcionista (attendant), lavador que vende pacotes (salesperson). Todos no mesmo Inbox, permissões diferentes.

---

### 6. "Como a IA sabe diferenciar um lead quente de um frio?"

**Resposta técnica:** classifyLead retorna leadScore 0–100 com regras: quote_request ~72, purchase ~88, information ~15–45. Combina texto, intent, urgency, budgetSignal, dados enriquecidos (phone +10, email +10, company +8). Classificação: hot ≥70, warm 35–69, cold <35. Dashboard conta hot leads via detectedIntent in (interest, quote_request, urgency) em oportunidades abertas.

**Linguagem simples:** É termômetro — quanto mais a pessoa fala de preço, compra e urgência, mais quente fica. "Quanto custa?" esquenta; "vocês abrem sábado?" morna ou fria.

**Exemplo prático:**  
- "Quanto custa premium?" → 72, quente.  
- "Só passando pra saber horário" → 15–45, frio/morno.  
- "Quero fechar pacote mensal" → 88, quentíssimo.

---

### 7. "Preciso trocar meu WhatsApp atual?"

**Resposta técnica:** Não. Evolution GO conecta via QR ao número existente (Aparelhos conectados). Z-API vincula instância ao número comercial já usado. Respostas saem pelo mesmo número via API. Recomendação: usar celular/linha da empresa, não pessoal do dono.

**Linguagem simples:** Mesmo número que clientes já têm salvo. Só adiciona "WhatsApp Web" para o CRM.

**Exemplo prático:** Uala Car mantém (85) 99999-8888 — clientes não percebem diferença, equipe atende pela tela do CRM.

---

### 8. "Como vejo o retorno sobre o investimento?"

**Resposta técnica:** Dashboard — receita prevista (soma oportunidades abertas), receita realizada (Revenue paid no mês). Relatórios — vendas por mês, produto, vendedor. Oportunidades ganhas/perdidas. AiLog — volume de ações automatizadas. Métricas operacionais — conversas sem resposta, tarefas atrasadas, leads quentes.

**Linguagem simples:** Antes você chutava. Agora vê quanto tem na mesa, quanto entrou no caixa, quantos leads quentes a IA encontrou.

**Exemplo prático:** Uala Car fechou 3 pacotes corporativos no mês → receita realizada R$ 8.400 no Dashboard → relatório mostra produto "Pacote 20 lavagens" como campeão.

---

### 9. "Posso personalizar o que a IA faz?"

**Resposta técnica:** Sim. Tenant settings — aiAgent: enabled, name, tone (professional/friendly/empathetic/direct), custom instructions via getTenantAiSystemPrompt mesclado em todos os prompts. Pipeline customizável (etapas e nomes). Tags configuráveis. Produtos e contexto de negócio influenciam classificação.

**Linguagem simples:** Você ensina a IA quem você é — "Somos lava jato em Fortaleza, tom amigável, premium custa X".

**Exemplo prático:** Instruções Uala Car: "Mencionar promoção de sábado. Nunca prometer horário sem confirmar vaga." IA incorpora no resumo e sugestões.

---

### 10. "O que acontece quando um lead some sem responder?"

**Resposta técnica:** Múltiplos mecanismos: (1) detectStalledLeads — contato lead sem oportunidade 3+ dias, oportunidade parada 7+ dias; (2) generateFollowUps — conversas open com lastMessageAt > 3 dias; (3) suggestNextAction — "Retomar contato — oportunidade parada" se days ≥ 5; (4) Dashboard gargalos com urgência por dias parados (14+ = high). Tarefas com prazo e prioridade automáticos.

**Linguagem simples:** O CRM não esquece. Se Maria parar de responder, surge tarefa "Retomar contato" com sugestão de mensagem de follow-up.

**Exemplo prático:** Maria pediu orçamento, Carlos respondeu, ela sumiu 5 dias → Dashboard mostra gargalo → tarefa alta prioridade → IA sugere follow-up amigável: "Olá Maria, conseguiu ver nosso orçamento?"

---

### Tom sugerido para os apresentadores

Formato ping-pong: contratante cético vs. Ronald explicando com calma e exemplos Uala Car.

---

## Episódio 7 — O que vem a seguir (roadmap)

### Contexto do episódio

Honestidade comercial — o que funciona hoje, o que vem depois, e por que fases importam.

### O que está funcionando hoje (versão atual)

**Core CRM completo:**

- Multi-tenant com isolamento de dados.
- Autenticação, equipe, papéis e permissões.
- Contatos com lead score 0–100.
- Oportunidades com Kanban e pipeline configurável.
- Central de Tarefas (manual + IA).
- Faturamento e relatórios.
- Produtos, empresas, tags, automations base.

**Inbox unificado:**

- WhatsApp (Z-API + Evolution GO + Meta Cloud API).
- Instagram (estrutura pronta).
- Conversas manuais, e-mail (canal suportado no schema).
- Status: aberta, pendente, resolvida.
- Filtros por prioridade, canal, status.

**IA operacional (agente ligado):**

- Resumo automático de conversas.
- Classificação estratégica de leads.
- Detecção de intenção.
- Sugestão de resposta — texto pronto para o vendedor revisar e enviar pelo Inbox (envio automático pela IA: em desenvolvimento).
- Criação automática de oportunidades e tarefas.
- Detecção de gargalos / leads parados.
- Auto-tagging, follow-up, stage advance (ações disponíveis).
- Auditoria completa em AiLog.
- Painel de IA no Inbox para ações manuais.

**Dashboard inteligente:**

- 8 KPIs clicáveis.
- Funil visual por etapa.
- Ações da IA hoje (8 registros).
- Gargalos com urgência colorida.
- Tarefas prioritárias.
- Onboarding checklist (4 passos).
- Modo demo guiado.

**Integrações e infra:**

- Webhook com retry, logs, rate limit, idempotência.
- Health check Evolution.
- Importação CSV.
- Deploy Vercel + Neon Postgres.
- Branding por tenant.

### O que entra na próxima fase

**1. Resposta automática da IA (Cenário B)**  
Hoje: nos dois cenários a IA classifica os leads e sugere respostas em tempo real; o atendimento ao cliente é feito pelo bot (Cenário A) ou pelo vendedor no Inbox (Cenário B).  
Próximo: atendimento automático pela IA via Evolution GO, com guardrails, FAQs customizáveis e escalonamento fino — sempre com opção de humano no fechamento.

**2. Instagram integrado end-to-end**  
Schema e processador inbound prontos. Próximo: fluxo de conexão Meta completo na UI de Integrações (guia Meta já referenciado em `/settings/integrations/guia-meta`).

**3. Relatórios de performance da IA**  
AiLog existe — próximo: dashboard dedicado — taxa de classificação correta, leads gerados pela IA, tempo médio de resposta antes/depois, ROI da automação.

**4. App mobile**  
Hoje: responsivo no navegador (Inbox funciona em telas menores). Próximo: app nativo ou PWA com push para lead quente e conversa sem resposta.

**Outras evoluções naturais:**

- Suporte a mídia WhatsApp (imagem, áudio, documento) no webhook.
- O sistema permite **importar contatos via planilha CSV**. Exportação em massa será implementada em versão futura.
- Resposta automática com aprovação em lote (Cenário B).
- Múltiplos números WhatsApp por tenant (filiais).

### Por que construir em fases é mais inteligente

Ronald é **desenvolvedor solo**. Cada fase entrega valor vendável:

| Fase | Valor para cliente | Risco evitado |
|------|-------------------|---------------|
| 1 — CRM + IA assistiva | Organização imediata, zero medo de robô | IA enviando preço errado |
| 2 — Automação controlada | Escala no atendimento repetitivo | Perda de humanização |
| 3 — Analytics de IA | Prova ROI para renovação | Investimento sem métrica |
| 4 — Mobile | Velocidade em campo | Complexidade prematura |

Construir tudo de uma vez = produto atrasado, bugs em produção, contratante cético.  
Construir em fases = Uala Car operando em semanas, feedback real, roadmap financiado pelo cliente.

### Como o feedback do contratante guia o desenvolvimento

**Loop de produto:**

1. Cliente usa versão atual (ex.: Uala Car no WhatsApp real).
2. Registra fricções — "preciso ver áudio", "quero Instagram", "equipe de 5 vendedores".
3. Ronald prioriza pelo impacto × esforço.
4. Entrega incremento testável.
5. Mede no Dashboard/AiLog se funcionou.

**Exemplos de feedback → feature:**

- "Perco mensagem de áudio" → transcribe + processar mídia (roadmap).
- "Dono quer ver o que IA fez" → AiLog no Dashboard (✅ feito).
- "Lead parado no funil" → detectStalledLeads (✅ feito).
- "Medo de robô respondendo" → Cenário A (bot existente + CRM organiza) ou Cenário B opt-in (✅ dois modelos).

O contratante da Uala Car não compra promessa — compra **parceria de evolução** com software que já resolve o problema central: CRM que se alimenta sozinho.

### Tom sugerido para os apresentadores

Técnico honesto: "Se você já tem bot, a IA do CRM não compete — organiza por trás. Se não tem, ela classifica e sugere as respostas, e você envia pelo Inbox — o atendimento 100% automático vem na próxima versão." Leigo aliviado: "Então escolho o modelo que combina com meu negócio?"

---

## Como usar este documento no NotebookLM

### Importar a fonte

1. Acesse [notebooklm.google.com](https://notebooklm.google.com).
2. Crie um **novo notebook**.
3. Clique em **Adicionar fonte** → **Upload de arquivo** ou **Google Docs**.
4. Faça upload deste arquivo: `docs/PODCAST-ROTEIRO.md`.
5. Opcionalmente, adicione também `docs/GUIA-DO-USUARIO.md` como segunda fonte para reforço.

### Prompt sugerido para gerar o podcast

Copie e cole no NotebookLM após importar:

```
Com base nas fontes deste notebook, gere um podcast em português brasileiro
com DOIS apresentadores:

- ALEX (técnico): desenvolvedor ou consultor que conhece o CRM PLUS por dentro.
  Explica o "como funciona" com clareza, usa analogias (campainha, termômetro,
  esteira de vendas) e cita números reais do sistema (lead score 0-100,
  faixas quente/morno/frio, prazos de tarefa).

- JULIA (leiga): dona de pequeno negócio, cética no início, faz perguntas
  que o contratante faria. Representa a Uala Car (lava jato em Fortaleza).

Estruture em 7 episódios conforme o roteiro:
1. O problema que o CRM resolve
2. Como a IA trabalha nos bastidores
3. O dashboard do vendedor
4. Jornada completa de um lead (Maria pedindo lavagem premium)
5. Integrações (Z-API, Evolution GO, WhatsApp)
6. 10 perguntas do contratante (formato objeção → resposta)
7. Roadmap e próximas fases

Regras:
- Conversa natural, não leitura de manual.
- Sem código, sem jargão técnico pesado.
- Cada episódio: 8 a 12 minutos de fala (~1200-1800 palavras por episódio).
- Julia reage emocionalmente ("nossa, então eu não preciso preencher planilha?").
- Alex confirma com exemplos práticos da Uala Car.
- Episódio 6: formato ping-pong rápido nas objeções.
- Tom: profissional mas acessível, entusiasmo moderado, honestidade no roadmap.
```

### Configurações recomendadas

| Parâmetro | Sugestão |
|-----------|----------|
| **Idioma** | Português (Brasil) |
| **Formato** | Deep Dive ou Briefing — teste ambos |
| **Duração por episódio** | 8–12 minutos |
| **Episódios** | Gere um de cada vez para controle de qualidade |
| **Tom** | Dois apresentadores — um técnico, um leigo |

### Dica de pós-produção

Após gerar cada episódio, peça ao NotebookLM:

```
Liste 3 frases deste episódio que um vendedor poderia usar
literalmente ao apresentar o CRM PLUS para um novo cliente.
```

Isso transforma o podcast em **script de vendas** derivado.

### Ordem de geração sugerida

1. Episódio 1 (problema) — ganha atenção.
2. Episódio 4 (jornada Maria) — emocional, concreto.
3. Episódio 6 (objeções) — ferramenta de vendas direta.
4. Episódios 2, 3, 5, 7 — aprofundamento.

---

*Documento gerado para Ronald — CRM PLUS. Baseado em código-fonte, schema Prisma, pipeline de IA e Guia do Usuário. Atualize quando novas features entrarem em produção.*
