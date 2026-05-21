import { prisma } from "@/lib/db/client";
import type { ProductStatus } from "@/lib/generated/prisma/enums";
import { parseCsv, pickField } from "@/lib/import/csv";
import { PRODUCT_FIELD_ALIASES } from "@/lib/import/field-aliases";
import type { ImportPreview, ImportResult } from "@/lib/import/types";

const MAX_ROWS = 3000;
const BATCH_SIZE = 50;
const PREVIEW_SAMPLE = 12;

type ParsedProduct = {
  rowNum: number;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  status: ProductStatus;
};

function parsePrice(raw: string): number | null {
  if (!raw.trim()) return 0;
  let s = raw.replace(/R\$\s?/gi, "").replace(/\s/g, "").trim();
  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseStatus(raw: string): ProductStatus {
  const s = raw.toLowerCase().trim();
  if (["inactive", "inativo", "inativa", "arquivado", "false", "0"].includes(s)) {
    return "inactive";
  }
  return "active";
}

function parseProductRow(
  row: Record<string, string>,
  rowNum: number,
): { ok: true; data: ParsedProduct } | { ok: false; message: string } {
  const name = pickField(row, [...PRODUCT_FIELD_ALIASES.name]);
  if (!name) return { ok: false, message: "Nome obrigatório." };

  const priceRaw = pickField(row, [...PRODUCT_FIELD_ALIASES.price]);
  const price = priceRaw ? parsePrice(priceRaw) : 0;
  if (price === null) return { ok: false, message: "Preço inválido." };

  return {
    ok: true,
    data: {
      rowNum,
      name,
      price,
      category: pickField(row, [...PRODUCT_FIELD_ALIASES.category]) || null,
      description: pickField(row, [...PRODUCT_FIELD_ALIASES.description]) || null,
      status: parseStatus(pickField(row, [...PRODUCT_FIELD_ALIASES.status])),
    },
  };
}

export async function previewProductsFromCsv(
  tenantId: string,
  csvText: string,
): Promise<ImportPreview> {
  const { headers, rows } = parseCsv(csvText);
  const preview: ImportPreview = {
    totalRows: rows.length,
    validRows: 0,
    wouldCreate: 0,
    wouldUpdate: 0,
    wouldSkip: 0,
    errorCount: 0,
    detectedColumns: headers,
    samples: [],
    errors: [],
  };

  if (rows.length === 0) {
    preview.errors.push({ row: 0, message: "Arquivo vazio." });
    return preview;
  }
  if (rows.length > MAX_ROWS) {
    preview.errors.push({ row: 0, message: `Máximo ${MAX_ROWS} linhas.` });
    return preview;
  }

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const parsed = parseProductRow(rows[i], rowNum);

    if (!parsed.ok) {
      preview.errorCount++;
      preview.wouldSkip++;
      if (preview.errors.length < 20) {
        preview.errors.push({ row: rowNum, message: parsed.message });
      }
      continue;
    }

    preview.validRows++;
    const existing = await prisma.product.findFirst({
      where: {
        tenantId,
        name: { equals: parsed.data.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing) preview.wouldUpdate++;
    else preview.wouldCreate++;

    if (preview.samples.length < PREVIEW_SAMPLE) {
      preview.samples.push({
        row: rowNum,
        action: existing ? "update" : "create",
        label: parsed.data.name,
      });
    }
  }

  return preview;
}

export async function importProductsFromCsv(
  tenantId: string,
  csvText: string,
  options: { updateExisting?: boolean } = {},
): Promise<ImportResult> {
  const { rows } = parseCsv(csvText);
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const updateExisting = options.updateExisting ?? true;

  if (rows.length === 0 || rows.length > MAX_ROWS) {
    result.errors.push({ row: 0, message: "Arquivo inválido ou muito grande." });
    return result;
  }

  const pending: ParsedProduct[] = [];
  for (let i = 0; i < rows.length; i++) {
    const parsed = parseProductRow(rows[i], i + 2);
    if (!parsed.ok) {
      result.skipped++;
      result.errors.push({ row: i + 2, message: parsed.message });
      continue;
    }
    pending.push(parsed.data);
  }

  for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
    const chunk = pending.slice(offset, offset + BATCH_SIZE);
    await prisma.$transaction(async (tx) => {
      for (const data of chunk) {
        try {
          const existing = await tx.product.findFirst({
            where: {
              tenantId,
              name: { equals: data.name, mode: "insensitive" },
            },
            select: { id: true },
          });

          if (existing) {
            if (!updateExisting) {
              result.skipped++;
              continue;
            }
            await tx.product.update({
              where: { id: existing.id },
              data: {
                price: data.price,
                category: data.category,
                description: data.description,
                status: data.status,
              },
            });
            result.updated++;
          } else {
            await tx.product.create({
              data: {
                tenantId,
                name: data.name,
                price: data.price,
                category: data.category,
                description: data.description,
                status: data.status,
              },
            });
            result.created++;
          }
        } catch (e) {
          result.skipped++;
          result.errors.push({
            row: data.rowNum,
            message: e instanceof Error ? e.message : "Erro ao salvar.",
          });
        }
      }
    });
  }

  return result;
}

export const PRODUCTS_CSV_TEMPLATE = `nome,preco,categoria,descricao,status
Consultoria mensal,1490.00,Servicos,Plano comercial,active
Licenca CRM Pro,2990.00,Software,Licenca anual,active
`;
