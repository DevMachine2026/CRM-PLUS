# Guia do Usuário — CRM PLUS

Manual para donos de negócio e vendedores. Linguagem simples, sem jargão desnecessário.

---

## 1. Visão geral

O **CRM PLUS** é um sistema para organizar vendas e atendimento da sua empresa em um só lugar. Ele junta contatos, conversas do WhatsApp (e outros canais), oportunidades de venda, tarefas e relatórios — com **inteligência artificial** que entende quem está pronto para comprar.

Existem **dois modelos de uso**, conforme a implantação da sua empresa:

| | **Cenário 1 — Bot externo** (ex.: Uala Car) | **Cenário 2 — IA do CRM** (novos clientes) |
|---|---------------------------------------------|---------------------------------------------|
| **Quem fala com o cliente no WhatsApp** | Seu **bot** (fora do CRM) | O **vendedor** (pelo Inbox do CRM) |
| **Papel da IA do CRM** | Só **classifica** leads em segundo plano | Acompanha em tempo real, **classifica** e indica a próxima ação |
| **Papel do vendedor** | Ver oportunidades e **decidir** — não responder pelo CRM | Responder o cliente pelo Inbox, **apoiado pela IA** |
| **Conexão WhatsApp** | Via **Z-API** (configurada pelo administrador) | Via **Evolution GO** — você conecta por **QR Code** |

> **Dica:** Não sabe qual é o seu? Pergunte ao administrador ou veja **Integrações** (seção 8). Se você conectou WhatsApp por QR Code no CRM, provavelmente é o Cenário 2.

Imagine a **Uala Car** (Cenário 1): o bot responde “qual serviço quer?”, “qual horário?”. O CRM recebe a conversa, cria o contato e a IA marca “lead quente — pediu pacote mensal”. O dono abre **Oportunidades** e liga para fechar — sem digitar no Inbox.

Imagine uma **concessionária nova** (Cenário 2): cliente manda “quanto custa o Civic?”. A IA do CRM acompanha a conversa em tempo real, classifica o lead e indica a próxima ação ao vendedor — que responde pelo Inbox; quando o lead esquenta, recebe um alerta: “lead pronto — priorize esta conversa”. O atendimento automático completo pela IA é uma funcionalidade em desenvolvimento para a próxima versão do sistema.

---

## 2. Como acessar

### URL

Acesse o endereço que sua empresa recebeu na implantação. Exemplo de produção:

`https://crm-plus-kappa.vercel.app`

Se sua empresa usa domínio próprio, use o link que o administrador passou.

### Login

1. Abra a página de **Entrar**
2. Digite seu **e-mail** e **senha**
3. Clique em **Entrar**

### Esqueci a senha

1. Na tela de login, clique em **Esqueceu a senha?**
2. Informe o e-mail cadastrado
3. Siga o link recebido por e-mail e crie uma nova senha

### Primeira vez na empresa

Se ainda não tem conta, use **Criar empresa** na tela de login (cadastro de nova empresa no sistema).

> **Dica:** Guarde o e-mail de login. Cada vendedor da equipe deve ter o seu, com permissões definidas pelo administrador.

---

## 3. Dashboard — sua central de comando

O **Dashboard** é a primeira tela após o login. Mostra um resumo do dia comercial.

### Cards principais

| Card | O que significa |
|------|-----------------|
| **Oportunidades abertas** | Negócios em andamento no funil |
| **Receita prevista** | Soma do valor das oportunidades abertas |
| **Receita realizada** | Valor já recebido no mês (vendas fechadas) |
| **Leads quentes** | Clientes com intenção forte de compra detectada pela IA |

### Cards do dia a dia

| Card | O que significa |
|------|-----------------|
| **Tarefas para hoje** | O que precisa ser feito hoje |
| **Tarefas atrasadas** | Pendências com prazo vencido |
| **Cobranças pendentes** | Pagamentos aguardando |
| **Conversas sem resposta** | **Cenário 1:** cliente aguardando no bot. **Cenário 2:** o vendedor ainda não respondeu |

### Outras áreas do Dashboard

- **Funil de vendas** — quantos negócios existem em cada etapa
- **Gargalos detectados pela IA** — leads ou negócios parados, com sugestão do que fazer
- **Ações da IA hoje** — registro do que a inteligência fez (classificou lead, resumiu conversa, etc.)
- **Tarefas prioritárias** — as mais urgentes da lista

### O que é “IA ativa”

No menu lateral, aparece **“IA ativa”** com um indicador verde. Isso mostra que o CRM tem inteligência artificial integrada.

Para a IA **trabalhar** (classificar leads, resumir conversas), ela precisa estar **ligada** em **Integrações → Agente de Inteligência Artificial**.

- **Cenário 1:** a IA **não atende** o cliente — só analisa o que o bot já conversou.
- **Cenário 2:** a IA **acompanha** as conversas do WhatsApp conectado (Evolution GO) em tempo real, **classifica** cada lead e **indica a próxima ação** ao vendedor, que responde pelo Inbox. O atendimento automático completo pela IA é uma funcionalidade em desenvolvimento para a próxima versão.

### O que fazer quando ver um lead quente

**Cenário 1 (bot externo — ex.: Uala Car):**

1. Abra **Oportunidades** ou **Contatos** — veja score e intenção
2. Leia o **resumo** da conversa no Inbox (só para entender — não responda por aqui)
3. **Ligue**, mande mensagem pelo bot ou fale pessoalmente para fechar
4. Atualize a oportunidade no funil quando fechar

**Cenário 2 (IA do CRM):**

1. Veja a **tarefa** ou alerta de “lead quente”
2. Abra **Conversas (Inbox)** e **responda** a conversa
3. Feche o negócio — proposta, contrato, agendamento
4. Marque oportunidade como **Ganha**

> **Dica:** Lead quente no lava jato = cliente que pediu preço da lavagem premium ou quer agendar hoje. Não deixe esfriar.

---

## 4. Conversas (Inbox)

No menu lateral, use **Conversas** — é o **Inbox**, a caixa de entrada unificada. Todas as mensagens que chegam ao CRM aparecem aqui, nos dois cenários.

### Cenário 1 — Bot externo (ex.: Uala Car)

O **bot** responde o cliente no WhatsApp. O CRM **só registra** a conversa — como um espelho do que aconteceu.

**Seu papel no Inbox:**

- **Ler** resumo, intenção e histórico
- **Não** usar o campo Enviar para falar com o cliente (quem atende é o bot)
- Usar a informação para decidir em **Oportunidades** e **Contatos**

> **Dica:** Dono do lava jato vê no Inbox que o cliente pediu “lavagem + cera + motor”. A IA marcou lead quente. Ele abre Oportunidades e liga — não precisa digitar no CRM.

### Cenário 2 — IA do CRM (Evolution GO)

No Cenário 2, com o WhatsApp conectado via Evolution GO, a **IA acompanha todas as conversas em tempo real**, **classifica cada lead automaticamente** e **indica ao vendedor a melhor ação a tomar**. Quem responde o cliente é o **vendedor, pelo Inbox**. O atendimento automático completo pela IA é uma funcionalidade em desenvolvimento para a próxima versão do sistema.

**Seu papel no Inbox:**

- **Responda o cliente pelo Inbox** — o WhatsApp conectado envia em seu nome
- Use o **resumo, a classificação e a próxima ação** sugerida pela IA como apoio
- Priorize as conversas que a IA marcar como lead quente

> **Dica:** Concessionária — a IA classifica o interesse no Civic e sugere a próxima ação; o vendedor responde pelo Inbox. Quando o cliente diz “quero fechar”, aparece tarefa de alta prioridade para o vendedor.

### De onde vêm as conversas

- **WhatsApp (Cenário 1)** — via **Z-API**, espelhando o que o bot conversou
- **WhatsApp (Cenário 2)** — via **Evolution GO**, número conectado por QR Code
- **Instagram** — se configurado
- **E-mail** — se configurado
- **Manual** — conversas criadas pela equipe dentro do CRM

Quando alguém manda mensagem no WhatsApp conectado, o sistema cria (ou localiza) o **contato**, abre a **conversa** e salva a mensagem automaticamente.

### Como ler uma conversa

1. Clique na conversa na lista à esquerda
2. As mensagens aparecem no centro — recebidas à esquerda, enviadas à direita
3. No topo: nome do contato, canal (WhatsApp, etc.) e **status**

Use os filtros:

- **Prioridade alta / Todas** — foco nos mais urgentes
- **Abertas, Pendentes, Resolvidas**
- **Canal** — WhatsApp, Instagram, e-mail ou manual

### O que a IA faz com cada mensagem

Quando a IA está ligada e chega mensagem do cliente, o CRM analisa em segundo plano:

| Ação | Cenário 1 (bot externo) | Cenário 2 (IA do CRM) |
|------|-------------------------|------------------------|
| **Resumo** | Sim — para o vendedor entender | Sim |
| **Intenção detectada** | Sim | Sim |
| **Classificação / lead score** | Sim | Sim |
| **Próxima ação sugerida** | Sim — ex.: “ligar para fechar” | Sim — ex.: “assumir conversa” |
| **Resposta ao cliente** | **Não** — responde o bot | **Não** (automático) — quem responde é o vendedor pelo Inbox; atendimento automático em desenvolvimento |

Badges como **Orçamento**, **Interesse** ou **Urgência** aparecem na lista para priorizar.

No **Painel de IA** (ícone de robô), você pode gerar resumo, detectar intenção ou pedir sugestão de texto (útil no Cenário 2 após assumir a conversa).

### Como responder um cliente (Cenário 2)

1. Selecione a conversa no Inbox
2. Leia o resumo da conversa e a classificação da IA
3. Escreva sua mensagem (ou use sugestão da IA como rascunho)
4. Clique em **Enviar**

**Cenário 1:** não responda pelo CRM — o bot cuida do WhatsApp.

### Status da conversa

| Status | Significado | Quando usar |
|--------|-------------|-------------|
| **Aberta** | Conversa ativa, em atendimento | Padrão ao receber mensagem |
| **Pendente** | Aguardando algo (cliente, documento, retorno interno) | Cliente disse “vou pensar e te aviso” |
| **Resolvida** | Assunto encerrado | Venda fechada, dúvida respondida ou desistência clara |

---

## 5. Contatos

**Contatos** reúne todas as pessoas com quem sua empresa conversa ou negocia.

### Criação automática

Quando chega mensagem no WhatsApp ou Instagram conectado, o CRM:

1. Identifica telefone ou ID do canal
2. Cria o contato se for a primeira vez
3. Atualiza o nome quando o cliente informa

Exemplo: primeira mensagem no lava jato de `(85) 99999-8888` → contato criado como lead automaticamente.

### Lead score (0 a 100)

Número que indica **potencial de fechamento**, calculado pela IA com base nas mensagens e dados do contato.

| Faixa | Significado | Cor (no sistema) |
|-------|-------------|------------------|
| **70 a 100** | Quente — alta chance de compra | Vermelho |
| **35 a 69** | Morno — interesse médio | Amarelo |
| **0 a 34** | Frio — pouco sinal comercial | Azul |

> **Dica:** Score 85 no lava jato = cliente pediu pacote mensal e perguntou formas de pagamento. Priorize.

### Busca e filtros

Use a barra de busca por **nome, e-mail ou telefone**. Contatos podem ter **tags** (ex.: orçamento, urgente) aplicadas pela IA ou pela equipe.

### Quando criar manualmente

Crie contato manualmente quando:

- Cliente ligou ou veio pessoalmente sem WhatsApp
- Feira ou evento — você anotou nome e telefone
- Indicação de outro cliente

Botão **+** ou **Novo contato** na tela de Contatos.

---

## 6. Oportunidades

Uma **oportunidade** é um negócio em andamento — uma venda possível com valor e etapas.

### Criação automática

A IA cria oportunidade quando detecta intenção comercial clara, por exemplo:

- Pedido de **orçamento** (“quanto custa?”)
- Intenção de **compra** (“quero fechar”)
- **Agendamento** com interesse real (test drive, visita)

Exemplo concessionária: “Quero simular financiamento do Civic” → oportunidade aberta na etapa adequada do funil.

### Pipeline de vendas

O **pipeline** (funil) é o caminho do negócio, em colunas. Exemplo típico:

1. Lead → 2. Qualificação → 3. Proposta → 4. Negociação → 5. Fechamento

Na tela **Oportunidades**, use a visão **Kanban** (cartões por coluna) ou **Lista**.

- **Arraste** o cartão entre colunas para avançar o negócio
- Ou edite a oportunidade e mude a etapa

### Registrar venda fechada

1. Abra a oportunidade
2. Marque como **Ganha** (ícone de troféu ou status “Ganha”)
3. Informe valor e produtos, se aplicável

Negócios **Perdidos** também podem ser registrados — ajuda nos relatórios.

> **Dica:** Lava jato fechou pacote corporativo de 20 lavagens/mês → marque **Ganha** e registre o valor. Isso entra na receita realizada do Dashboard.

---

## 7. Tarefas

A **Central de Tarefas** (menu Gestão) lista o que precisa ser feito.

### Tarefas criadas pela IA

A inteligência cria tarefas automaticamente, por exemplo:

- **Cenário 1:** “Lead quente — ligar para fechar”, “Retomar contato — oportunidade parada”
- **Cenário 2:** “Assumir conversa — cliente pronto para fechar”, “Cliente com urgência — responder agora”
- Nos dois: “Enviar proposta/orçamento”, “Follow-up: lead quente na conversa”

Identificadas pelo ícone de **robô** na lista.

### Tarefas manuais

Criadas por você ou colegas — follow-up, ligação, visita, envio de contrato.

### Como usar para não perder follow-up

1. Abra **Central de Tarefas** todo dia
2. Priorize **atrasadas** e **alta prioridade**
3. Marque como **Concluída** ao terminar
4. Use **Cancelada** se não fizer mais sentido

Filtros: pendentes, concluídas, por prioridade, por origem (IA ou manual).

> **Dica:** Configure rotina: manhã = tarefas do dia + leads quentes no Dashboard. **Cenário 1:** ligue ou use o bot. **Cenário 2:** assuma conversas transferidas.

---

## 8. Integrações

Em **Integrações** (rodapé do menu) você conecta canais e configura a IA. **Leia esta seção para saber qual modelo a sua empresa usa.**

### Qual modelo se aplica a mim?

```
┌─────────────────────────────────────────────────────────────────┐
│  CENÁRIO 1 — Bot externo (ex.: Uala Car)                        │
├─────────────────────────────────────────────────────────────────┤
│  Cliente → WhatsApp → SEU BOT → Z-API → CRM                    │
│                                                                 │
│  • Bot conversa com o cliente                                   │
│  • CRM recebe cópia das mensagens                               │
│  • IA do CRM só CLASSIFICA (não responde)                       │
│  • Vendedor usa Dashboard + Oportunidades (não responde no CRM) │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  CENÁRIO 2 — IA do CRM (novos clientes)                         │
├─────────────────────────────────────────────────────────────────┤
│  Cliente → WhatsApp → Evolution GO → CRM                        │
│                                                                 │
│  • Você conecta WhatsApp por QR Code nas Integrações            │
│  • IA do CRM CLASSIFICA e sugere a próxima ação                 │
│  • Quando lead quente → vendedor RESPONDE no Inbox              │
└─────────────────────────────────────────────────────────────────┘
```

| Pergunta | Cenário 1 | Cenário 2 |
|----------|-----------|-----------|
| Quem responde o cliente? | Seu **bot** | O **vendedor** (pelo Inbox) |
| Preciso conectar QR Code no CRM? | **Não** — admin configura Z-API | **Sim** |
| Uso o Inbox para responder? | **Não** — só para ler | **Sim** — você responde pelo Inbox |
| Onde fecho negócio? | Oportunidades + ligação/bot | Inbox + Oportunidades |

> **Dica:** Na dúvida, olhe Integrações. Se aparece **Conectado via Z-API** (sem QR no CRM), é Cenário 1. Se você escaneou **QR Code** aqui, é Cenário 2.

---

### Cenário 1 — Integração com bot + Z-API

Para empresas que **já têm chatbot** (Typebot, n8n, sistema próprio, etc.):

1. O **bot** continua atendendo no WhatsApp — nada muda para o cliente
2. A **Z-API** envia cada mensagem para o CRM (configuração feita pelo administrador)
3. O CRM **cria contato** e **conversa** automaticamente
4. A **IA classifica** em segundo plano: score, intenção, oportunidade, tarefa
5. O **vendedor** olha Dashboard e Oportunidades — **não responde pelo CRM**

Exemplo **Uala Car**: bot agenda lavagem; CRM mostra “lead quente — pacote mensal”; dono decide ligar.

---

### Cenário 2 — WhatsApp + Evolution GO

Para **novos clientes** sem bot próprio:

1. **Integrações → WhatsApp → Conectar**
2. Escaneie o **QR Code** (WhatsApp → Aparelhos conectados)
3. Aguarde **Conectado** com seu número exibido
4. Configure a **IA** (nome, tom, instruções do negócio)
5. Clientes mandam mensagem → **IA classifica o lead e sugere a próxima ação**; o vendedor responde pelo Inbox
6. Lead quente → **tarefa** avisa o vendedor → **responda no Inbox**

> **Dica:** Lava jato novo no CRM: conecte o WhatsApp comercial por QR. A IA classifica cada lead e sugere a resposta; o vendedor envia pelo Inbox. O atendimento automático completo pela IA é uma funcionalidade em desenvolvimento para a próxima versão.

---

### O que acontece quando chega uma mensagem (os dois cenários)

1. Cliente envia mensagem no WhatsApp
2. Mensagem chega ao CRM (via Z-API ou Evolution GO)
3. CRM cria ou atualiza **contato** e **conversa** no Inbox
4. IA analisa: resumo, intenção, score, oportunidade, tarefa
5. **Cenário 1:** bot segue atendendo; vendedor monitora
6. **Cenário 2:** IA classifica e sugere a próxima ação; o vendedor responde pelo Inbox

### Agente de Inteligência Artificial

Em **Integrações → Agente de IA**:

- **Cenário 1:** instruções focadas em **classificar** (não precisa tom de atendimento longo)
- **Cenário 2:** instruções completas — nome, tom, serviços, preços, quando chamar vendedor

### Instagram

Conexão via Meta (Facebook/Instagram), nos dois cenários. Disponível conforme configuração.

### Modo demonstração

Badge **Demo** ou **Modo demo** = ambiente de treino, sem WhatsApp real. QR simulado para aprender o fluxo.

---

## 9. Configurações

Em **Configurações** (menu inferior):

### Nome e tom da IA

- **Integrações → Agente de Inteligência Artificial**
- **Cenário 1:** foco em classificação — a IA lê conversas do bot
- **Cenário 2:** configure **nome** (ex.: Sara), **tom** (profissional, amigável, empático, direto) e **instruções** do negócio (ex.: “Somos a Uala Car, lava jato em Fortaleza…”) que orientam a classificação dos leads e as **sugestões de resposta** da IA

### Pipeline de vendas

Em **Gestão → Pipeline**, configure etapas do funil (nomes e ordem). Exemplo lava jato: Lead → Orçamento enviado → Agendado → Fechado.

Oportunidades novas entram na etapa que a IA ou o vendedor definir.

### Membros da equipe

Em **Configurações** ou **Equipe**:

- Adicionar vendedores, atendentes, gestores
- Papéis: Owner, Gestor, Vendedor, Atendente, Financeiro, Visualizador
- Cada um acessa com e-mail e senha próprios

### Importação de dados

Em **Configurações**, importe **contatos** ou **produtos** via planilha CSV (modelo disponível na tela).

> **Dica:** Dono da concessionária: cadastre produtos (modelos, serviços) antes de fechar oportunidades com valor correto.

---

## 10. Perguntas frequentes

### A IA responde automaticamente meus clientes?

**Depende do cenário:**

- **Cenário 1 (bot externo, ex.: Uala Car):** **Não.** Quem atende é o **seu bot**. A IA do CRM só **classifica** leads em segundo plano. O vendedor **não** responde pelo CRM.
- **Cenário 2 (Evolution GO):** **Ainda não de forma automática.** Com o WhatsApp conectado via Evolution GO, a IA **acompanha todas as conversas em tempo real, classifica cada lead automaticamente e indica ao vendedor a melhor ação a tomar** — quem responde o cliente é o vendedor, pelo Inbox. O atendimento automático completo pela IA é uma funcionalidade em desenvolvimento para a próxima versão do sistema.

### Qual cenário é o meu?

- Tem **bot próprio** e integração **Z-API** → Cenário 1
- Conectou WhatsApp por **QR Code** no CRM → Cenário 2
- Na dúvida, pergunte ao administrador

### Como sei se um lead está quente?

Três sinais: **lead score** acima de 70 no contato, badge de intenção (orçamento, interesse, urgência) na conversa, card **Leads quentes** no Dashboard. Priorize esses primeiro.

### O que fazer quando a IA errar uma classificação?

Corrija manualmente: ajuste o contato, a oportunidade ou a tarefa. **Cenário 1:** continue atendendo pelo bot. **Cenário 2:** ajuste a classificação e responda a conversa pelo Inbox.

### Posso usar em mais de um WhatsApp?

Cada **empresa** (conta) conecta **um número principal** por integração. Vários números ou filiais exigem configuração com o administrador ou contas separadas.

### Os dados dos meus clientes estão seguros?

Sim, em ambiente profissional: acesso por login e senha, permissões por papel, dados isolados por empresa. Não compartilhe senha. Só usuários autorizados veem contatos e conversas.

### Preciso saber de tecnologia para usar?

**Não.** Se você usa WhatsApp Web e planilha, consegue usar o CRM. Conectar WhatsApp (QR Code) e configurar IA pedem alguns cliques — o administrador pode fazer na implantação.

### Como a IA sabe a intenção do cliente?

Ela lê as **mensagens** (palavras como “preço”, “orçamento”, “quero comprar”, “reclamação”) e o **histórico recente** da conversa. Depois classifica: orçamento, interesse, dúvida, reclamação, urgência, etc.

### O que é lead score?

Nota de **0 a 100** no contato — quanto maior, maior a chance de fechar negócio. Atualizada quando a IA analisa mensagens. Use para decidir quem atender primeiro.

### Posso adicionar minha equipe?

**Sim.** Em Configurações ou Equipe, o administrador adiciona membros com e-mail, senha e papel (vendedor, atendente, etc.).

### Como importar meus contatos?

Em **Configurações**, use a **importação por planilha CSV**. Baixe o modelo na tela, preencha nome, telefone e e-mail, e envie o arquivo. O sistema cria ou atualiza os contatos em lote.

### Por que a conversa não apareceu no CRM?

**Cenário 1 (Z-API + bot):** confirme com o administrador se a Z-API está enviando mensagens ao CRM. O bot precisa estar ativo no WhatsApp.

**Cenário 2 (Evolution GO):** verifique WhatsApp **conectado** em Integrações (QR escaneado aqui), IA **ligada**, mensagem enviada de **outro celular** (não do aparelho conectado). Se persistir, reconecte o QR em Integrações.

### O CRM funciona no celular?

Sim, pelo navegador do celular ou tablet. Layout se adapta; Inbox e contatos funcionam bem em telas menores.

---

## 11. Glossário

| Termo | Explicação simples |
|-------|-------------------|
| **Lead score** | Nota de 0 a 100 no contato. Quanto maior, mais perto de comprar. |
| **Pipeline** | Funil de vendas — etapas do negócio do primeiro contato até fechar. |
| **Oportunidade** | Um negócio em andamento, com valor e etapa no funil. |
| **Inbox** | Caixa de entrada — todas as conversas (WhatsApp, etc.) num lugar só. |
| **Webhook** | “Avise o CRM quando chegar mensagem.” Conexão invisível entre WhatsApp e sistema — você não precisa configurar no dia a dia. |
| **IA** | Inteligência artificial do CRM. **Cenário 1:** classifica leads (bot atende). **Cenário 2:** acompanha, classifica e indica a próxima ação; o vendedor atende pelo Inbox (atendimento automático em desenvolvimento). |
| **Z-API** | Ponte entre WhatsApp e CRM usada no **Cenário 1** (bot externo). |
| **Evolution GO** | Conexão WhatsApp por QR Code no **Cenário 2** (vendedor atende pelo Inbox, com apoio da IA). |
| **Bot externo** | Chatbot da sua empresa que conversa com o cliente — o CRM só recebe e analisa. |
| **Classificação de lead** | Análise da IA: quente, morno ou frio, com base nas mensagens. |
| **Tenant** | Sua **empresa** dentro do sistema. Cada lava jato ou concessionária cadastrada é um tenant separado — dados não se misturam. |

---

## Menu rápido de referência

| Menu | Para quê |
|------|----------|
| Dashboard | Resumo do dia |
| Conversas (Inbox) | Histórico de mensagens. Cenário 1: só leitura. Cenário 2: vendedor responde pelo Inbox |
| Oportunidades | Funil de vendas |
| Contatos | Cadastro de clientes |
| Central de Tarefas | Pendências e follow-ups |
| Faturamento | Cobranças |
| Pipeline | Configurar etapas do funil |
| Relatórios | Vendas por mês, produto, vendedor |
| Integrações | WhatsApp, Instagram, IA |
| Configurações | Empresa, equipe, importação |

---

*Documento baseado nas funcionalidades do CRM PLUS. Dúvidas sobre implantação ou WhatsApp: fale com o administrador da sua conta.*
