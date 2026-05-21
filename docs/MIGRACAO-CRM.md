# Migrar de outro CRM para o CRM PLUS

Guia alinhado às melhores práticas de importação B2B SaaS.

## Princípios

1. **Nunca importar direto em produção sem revisar** — use sempre a pré-visualização.
2. **Levar o ID do CRM antigo** na coluna `external_id` — evita duplicados ao reimportar.
3. **Um tipo por vez** — contatos primeiro, produtos depois, oportunidades em fase futura.
4. **CSV UTF-8** — no Excel: *Salvar como → CSV UTF-8 (delimitado por vírgula)*.

## Fluxo no sistema

```
Exportar CSV no CRM antigo
        ↓
Configurações → Migrar → Enviar e revisar
        ↓
Conferir: novos / atualizados / erros
        ↓
Confirmar importação
```

## Colunas reconhecidas automaticamente

### Contatos

| Campo CRM PLUS | Exemplos de colunas no export |
|----------------|-------------------------------|
| Nome | `nome`, `name`, `Contact Name`, `Full Name` |
| E-mail | `email`, `Email`, `email_address` |
| Telefone | `telefone`, `phone`, `mobilephone`, `WhatsApp` |
| Empresa | `empresa`, `company`, `Company Name`, `Account` |
| Status | `status`, `lifecycle`, `Lead Status` |
| ID externo | `external_id`, `Record ID`, `hs_object_id` |

Status: `lead` (padrão), `customer` / `cliente`, `inactive`.

### Produtos

| Campo CRM PLUS | Exemplos |
|----------------|----------|
| Nome | `nome`, `product_name`, `Item` |
| Preço | `preco`, `price`, `amount` — aceita `1490.00` ou `1.490,00` |
| Categoria | `categoria`, `category` |
| Status | `active` / `inactive` |

## Marca (white-label)

**Configurações → Marca**

- Upload de logo (PNG/JPG/WebP/SVG até 400 KB) ou URL
- Cor principal com contraste automático no texto dos botões
- Tema aplicado no servidor (sem flash de cor ao abrir)

## Limites

- Até **3.000 linhas** por arquivo
- Importação em **lotes** (transação) para consistência

## Próximas fases (roadmap)

- Importação de oportunidades + pipeline
- Mapeamento manual de colunas na UI
- Histórico de importações por usuário
