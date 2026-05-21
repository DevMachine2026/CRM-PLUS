import { prisma } from "@/lib/db/client";
import { parseCsv, pickField } from "@/lib/import/csv";
import type { ContactStatus } from "@/lib/generated/prisma/enums";

const MAX_ROWS = 3000;

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `+${digits}`;
}

function parseStatus(raw: string): ContactStatus {
  const s = raw.toLowerCase().trim();
  if (["customer", "cliente", "client"].includes(s)) return "customer";
  if (["inactive", "inativo", "inativa"].includes(s)) return "inactive";
  return "lead";
}

export async function importContactsFromCsv(
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
      message: `Máximo de ${MAX_ROWS} linhas por importação. Divida o arquivo.`,
    });
    return result;
  }

  const updateExisting = options.updateExisting ?? true;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const row = rows[i];

    const name = pickField(row, ["nome", "name", "contato", "contact", "full_name"]);
    if (!name) {
      result.errors.push({ row: rowNum, message: "Nome obrigatório." });
      result.skipped++;
      continue;
    }

    const emailRaw = pickField(row, ["email", "e_mail", "e-mail"]);
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const phoneRaw = pickField(row, [
      "telefone",
      "phone",
      "celular",
      "whatsapp",
      "mobile",
      "fone",
    ]);
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
    const companyName = pickField(row, [
      "empresa",
      "company",
      "organizacao",
      "organization",
      "razao_social",
    ]);
    const status = parseStatus(pickField(row, ["status", "estagio", "tipo"]));
    const externalId = pickField(row, ["external_id", "id_externo", "id", "crm_id"]);

    if (!email && !phone) {
      result.errors.push({ row: rowNum, message: "Informe e-mail ou telefone." });
      result.skipped++;
      continue;
    }

    try {
      let companyId: string | null = null;
      if (companyName) {
        let company = await prisma.company.findFirst({
          where: { tenantId, name: { equals: companyName, mode: "insensitive" } },
          select: { id: true },
        });
        if (!company) {
          company = await prisma.company.create({
            data: { tenantId, name: companyName },
            select: { id: true },
          });
        }
        companyId = company.id;
      }

      const existing = await prisma.contact.findFirst({
        where: {
          tenantId,
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
            ...(externalId ? [{ externalId }] : []),
          ],
        },
        select: { id: true },
      });

      if (existing) {
        if (!updateExisting) {
          result.skipped++;
          continue;
        }
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            name,
            email,
            phone,
            companyId,
            status,
            ...(externalId ? { externalId } : {}),
          },
        });
        result.updated++;
      } else {
        await prisma.contact.create({
          data: {
            tenantId,
            name,
            email,
            phone,
            companyId,
            status,
            externalId: externalId || null,
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

export const CONTACTS_CSV_TEMPLATE = `nome,email,telefone,empresa,status
João Silva,joao@empresa.com,5511999887766,Acme Ltda,lead
Maria Santos,maria@empresa.com,5521988776655,,customer
`;
