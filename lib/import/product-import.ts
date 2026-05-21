import { prisma } from "@/lib/db/client";
import { parseCsv, pickField } from "@/lib/import/csv";
import type { ProductStatus } from "@/lib/generated/prisma/enums";
import type { ImportResult } from "@/lib/import/contact-import";

const MAX_ROWS = 3000;

function parsePrice(raw: string): number | null {
  const cleaned = raw
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseStatus(raw: string): ProductStatus {
  const s = raw.toLowerCase().trim();
  if (["inactive", "inativo", "inativa", "arquivado"].includes(s)) return "inactive";
  return "active";
}

export async function importProductsFromCsv(
  tenantId: string,
  csvText: string,
  options: { updateExisting?: boolean } = {},
): Promise<ImportResult> {
  const { rows } = parseCsv(csvText);
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  if (rows.length === 0) {
    result.errors.push({ row: 0, message: "Arquivo vazio ou sem linhas de dados." });
    return result;
  }
  if (rows.length > MAX_ROWS) {
    result.errors.push({
      row: 0,
      message: `Máximo de ${MAX_ROWS} linhas por importação.`,
    });
    return result;
  }

  const updateExisting = options.updateExisting ?? true;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];

    const name = pickField(row, ["nome", "name", "produto", "product", "titulo"]);
    if (!name) {
      result.errors.push({ row: rowNum, message: "Nome do produto obrigatório." });
      result.skipped++;
      continue;
    }

    const priceRaw = pickField(row, ["preco", "price", "valor", "value", "preco_unitario"]);
    const price = priceRaw ? parsePrice(priceRaw) : 0;
    if (price === null) {
      result.errors.push({ row: rowNum, message: "Preço inválido." });
      result.skipped++;
      continue;
    }

    const category = pickField(row, ["categoria", "category", "tipo"]) || null;
    const description =
      pickField(row, ["descricao", "description", "detalhes"]) || null;
    const status = parseStatus(pickField(row, ["status", "situacao"]));

    try {
      const existing = await prisma.product.findFirst({
        where: {
          tenantId,
          name: { equals: name, mode: "insensitive" },
        },
        select: { id: true },
      });

      if (existing) {
        if (!updateExisting) {
          result.skipped++;
          continue;
        }
        await prisma.product.update({
          where: { id: existing.id },
          data: { price, category, description, status },
        });
        result.updated++;
      } else {
        await prisma.product.create({
          data: {
            tenantId,
            name,
            price,
            category,
            description,
            status,
          },
        });
        result.created++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar linha.";
      result.errors.push({ row: rowNum, message: msg });
      result.skipped++;
    }
  }

  return result;
}

export const PRODUCTS_CSV_TEMPLATE = `nome,preco,categoria,descricao,status
Consultoria mensal,1490.00,Servicos,Plano de consultoria comercial,active
Licenca CRM Pro,2990.00,Software,Licenca anual do sistema,active
`;
