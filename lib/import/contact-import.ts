import { prisma } from "@/lib/db/client";
import type { ContactStatus } from "@/lib/generated/prisma/enums";
import { parseCsv, pickField } from "@/lib/import/csv";
import { CONTACT_FIELD_ALIASES } from "@/lib/import/field-aliases";
import type { ImportPreview, ImportResult } from "@/lib/import/types";

const MAX_ROWS = 3000;
const BATCH_SIZE = 50;
const PREVIEW_SAMPLE = 12;

type ParsedContact = {
  rowNum: number;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string;
  status: ContactStatus;
  externalId: string;
};

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `+${digits}`;
}

function parseStatus(raw: string): ContactStatus {
  const s = raw.toLowerCase().trim();
  if (["customer", "cliente", "client", "won", "ganho"].includes(s)) return "customer";
  if (["inactive", "inativo", "inativa", "lost", "perdido"].includes(s)) return "inactive";
  return "lead";
}

function parseContactRow(row: Record<string, string>, rowNum: number): {
  ok: true;
  data: ParsedContact;
} | {
  ok: false;
  message: string;
} {
  const name = pickField(row, [...CONTACT_FIELD_ALIASES.name]);
  if (!name) return { ok: false, message: "Nome obrigatório." };

  const emailRaw = pickField(row, [...CONTACT_FIELD_ALIASES.email]);
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const phoneRaw = pickField(row, [...CONTACT_FIELD_ALIASES.phone]);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

  if (!email && !phone) {
    return { ok: false, message: "Informe e-mail ou telefone." };
  }

  return {
    ok: true,
    data: {
      rowNum,
      name,
      email,
      phone,
      companyName: pickField(row, [...CONTACT_FIELD_ALIASES.company]),
      status: parseStatus(pickField(row, [...CONTACT_FIELD_ALIASES.status])),
      externalId: pickField(row, [...CONTACT_FIELD_ALIASES.externalId]),
    },
  };
}

async function resolveExisting(
  tenantId: string,
  data: ParsedContact,
): Promise<{ id: string } | null> {
  return prisma.contact.findFirst({
    where: {
      tenantId,
      OR: [
        ...(data.email ? [{ email: data.email }] : []),
        ...(data.phone ? [{ phone: data.phone }] : []),
        ...(data.externalId ? [{ externalId: data.externalId }] : []),
      ],
    },
    select: { id: true },
  });
}

export async function previewContactsFromCsv(
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
    preview.errors.push({
      row: 0,
      message: `Máximo ${MAX_ROWS} linhas. Divida o arquivo.`,
    });
    return preview;
  }

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const parsed = parseContactRow(rows[i], rowNum);

    if (!parsed.ok) {
      preview.errorCount++;
      preview.wouldSkip++;
      if (preview.errors.length < 20) {
        preview.errors.push({ row: rowNum, message: parsed.message });
      }
      if (preview.samples.length < PREVIEW_SAMPLE) {
        preview.samples.push({
          row: rowNum,
          action: "error",
          label: "—",
          message: parsed.message,
        });
      }
      continue;
    }

    preview.validRows++;
    const existing = await resolveExisting(tenantId, parsed.data);
    const action = existing ? "update" : "create";
    if (existing) preview.wouldUpdate++;
    else preview.wouldCreate++;

    if (preview.samples.length < PREVIEW_SAMPLE) {
      preview.samples.push({
        row: rowNum,
        action,
        label: parsed.data.name,
        message: existing ? "Atualizar existente" : "Novo contato",
      });
    }
  }

  return preview;
}

async function upsertCompany(
  tenantId: string,
  companyName: string,
  cache: Map<string, string>,
): Promise<string | null> {
  if (!companyName) return null;
  const key = companyName.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

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
  cache.set(key, company.id);
  return company.id;
}

export async function importContactsFromCsv(
  tenantId: string,
  csvText: string,
  options: { updateExisting?: boolean } = {},
): Promise<ImportResult> {
  const { rows } = parseCsv(csvText);
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const updateExisting = options.updateExisting ?? true;
  const companyCache = new Map<string, string>();

  if (rows.length === 0 || rows.length > MAX_ROWS) {
    result.errors.push({ row: 0, message: "Arquivo inválido ou muito grande." });
    return result;
  }

  const pending: ParsedContact[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = parseContactRow(rows[i], i + 2);
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
          const companyId = await upsertCompany(
            tenantId,
            data.companyName,
            companyCache,
          );
          const existing = await tx.contact.findFirst({
            where: {
              tenantId,
              OR: [
                ...(data.email ? [{ email: data.email }] : []),
                ...(data.phone ? [{ phone: data.phone }] : []),
                ...(data.externalId ? [{ externalId: data.externalId }] : []),
              ],
            },
            select: { id: true },
          });

          if (existing) {
            if (!updateExisting) {
              result.skipped++;
              continue;
            }
            await tx.contact.update({
              where: { id: existing.id },
              data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                companyId,
                status: data.status,
                ...(data.externalId ? { externalId: data.externalId } : {}),
              },
            });
            result.updated++;
          } else {
            await tx.contact.create({
              data: {
                tenantId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                companyId,
                status: data.status,
                externalId: data.externalId || null,
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

export const CONTACTS_CSV_TEMPLATE = `nome,email,telefone,empresa,status,external_id
João Silva,joao@empresa.com,5511999887766,Acme Ltda,lead,CRM-001
Maria Santos,maria@empresa.com,5521988776655,Beta SA,customer,CRM-002
`;
