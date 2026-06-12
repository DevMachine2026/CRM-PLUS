import { prisma } from "@/lib/db/client";
import { ensureDefaultPipeline } from "@/lib/db/ensure-default-pipeline";
import type { OpportunityStatus } from "@/lib/generated/prisma/enums";
import { parseCsv, pickField } from "@/lib/import/csv";
import { OPPORTUNITY_FIELD_ALIASES } from "@/lib/import/field-aliases";
import type { ImportPreview, ImportResult } from "@/lib/import/types";

const MAX_ROWS = 3000;
const BATCH_SIZE = 50;
const PREVIEW_SAMPLE = 12;

type StageRef = { id: string; name: string; order: number };

type PipelineContext = {
  pipelineId: string;
  stages: StageRef[];
  firstStage: StageRef;
  lastStage: StageRef;
};

type ParsedOpportunity = {
  rowNum: number;
  title: string;
  value: number | null;
  status: OpportunityStatus;
  stageName: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactExternalId: string;
  expectedCloseAt: Date | null;
  notes: string | null;
  externalId: string;
};

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `+${digits}`;
}

function parseValue(raw: string): number | null {
  if (!raw.trim()) return null;
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

function parseStatus(raw: string): OpportunityStatus {
  const s = raw.toLowerCase().trim();
  if (["won", "ganho", "ganha", "fechado", "fechada", "closed_won", "vendido"].includes(s)) {
    return "won";
  }
  if (["lost", "perdido", "perdida", "closed_lost", "cancelado", "cancelada"].includes(s)) {
    return "lost";
  }
  return "open";
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  // DD/MM/YYYY ou DD-MM-YYYY
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    let year = Number(br[3]);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // ISO (YYYY-MM-DD...) ou outros formatos reconhecidos pelo Date
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function loadPipelineContext(tenantId: string): Promise<PipelineContext | null> {
  await ensureDefaultPipeline(tenantId);

  const pipeline = await prisma.pipeline.findFirst({
    where: { tenantId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      stages: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, order: true },
      },
    },
  });

  if (!pipeline || pipeline.stages.length === 0) return null;

  return {
    pipelineId: pipeline.id,
    stages: pipeline.stages,
    firstStage: pipeline.stages[0],
    lastStage: pipeline.stages[pipeline.stages.length - 1],
  };
}

function resolveStage(ctx: PipelineContext, stageName: string): StageRef {
  if (!stageName) return ctx.firstStage;
  const target = stageName.toLowerCase().trim();
  const exact = ctx.stages.find((s) => s.name.toLowerCase().trim() === target);
  if (exact) return exact;
  const partial = ctx.stages.find(
    (s) =>
      s.name.toLowerCase().includes(target) ||
      target.includes(s.name.toLowerCase()),
  );
  return partial ?? ctx.firstStage;
}

function parseOpportunityRow(
  row: Record<string, string>,
  rowNum: number,
): { ok: true; data: ParsedOpportunity } | { ok: false; message: string } {
  const title = pickField(row, [...OPPORTUNITY_FIELD_ALIASES.title]);
  if (!title) return { ok: false, message: "Título obrigatório." };

  const valueRaw = pickField(row, [...OPPORTUNITY_FIELD_ALIASES.value]);
  const value = valueRaw ? parseValue(valueRaw) : null;
  if (valueRaw && value === null) {
    return { ok: false, message: "Valor inválido." };
  }

  const emailRaw = pickField(row, [...OPPORTUNITY_FIELD_ALIASES.contactEmail]);
  const phoneRaw = pickField(row, [...OPPORTUNITY_FIELD_ALIASES.contactPhone]);
  const closeRaw = pickField(row, [...OPPORTUNITY_FIELD_ALIASES.expectedCloseAt]);

  return {
    ok: true,
    data: {
      rowNum,
      title,
      value,
      status: parseStatus(pickField(row, [...OPPORTUNITY_FIELD_ALIASES.status])),
      stageName: pickField(row, [...OPPORTUNITY_FIELD_ALIASES.stage]),
      contactName: pickField(row, [...OPPORTUNITY_FIELD_ALIASES.contactName]),
      contactEmail: emailRaw ? emailRaw.toLowerCase() : null,
      contactPhone: phoneRaw ? normalizePhone(phoneRaw) : null,
      contactExternalId: pickField(row, [...OPPORTUNITY_FIELD_ALIASES.contactExternalId]),
      expectedCloseAt: closeRaw ? parseDate(closeRaw) : null,
      notes: pickField(row, [...OPPORTUNITY_FIELD_ALIASES.notes]) || null,
      externalId: pickField(row, [...OPPORTUNITY_FIELD_ALIASES.externalId]),
    },
  };
}

export async function previewOpportunitiesFromCsv(
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

  const ctx = await loadPipelineContext(tenantId);
  if (!ctx) {
    preview.errors.push({
      row: 0,
      message: "Nenhum funil configurado. Crie um pipeline antes de importar.",
    });
    return preview;
  }

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const parsed = parseOpportunityRow(rows[i], rowNum);

    if (!parsed.ok) {
      preview.errorCount++;
      preview.wouldSkip++;
      if (preview.errors.length < 20) {
        preview.errors.push({ row: rowNum, message: parsed.message });
      }
      continue;
    }

    preview.validRows++;
    const existing = parsed.data.externalId
      ? await prisma.opportunity.findFirst({
          where: { tenantId, externalId: parsed.data.externalId },
          select: { id: true },
        })
      : null;
    if (existing) preview.wouldUpdate++;
    else preview.wouldCreate++;

    if (preview.samples.length < PREVIEW_SAMPLE) {
      const stage = resolveStage(ctx, parsed.data.stageName);
      preview.samples.push({
        row: rowNum,
        action: existing ? "update" : "create",
        label: parsed.data.title,
        message: `${stage.name} · ${parsed.data.status}`,
      });
    }
  }

  return preview;
}

async function resolveOrCreateContact(
  tenantId: string,
  data: ParsedOpportunity,
): Promise<string | null> {
  const orFilters = [
    ...(data.contactEmail ? [{ email: data.contactEmail }] : []),
    ...(data.contactPhone ? [{ phone: data.contactPhone }] : []),
    ...(data.contactExternalId ? [{ externalId: data.contactExternalId }] : []),
  ];

  if (orFilters.length > 0) {
    const existing = await prisma.contact.findFirst({
      where: { tenantId, OR: orFilters },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  const name =
    data.contactName || data.contactEmail || data.contactPhone || null;
  if (!name) return null;

  const created = await prisma.contact.create({
    data: {
      tenantId,
      name,
      email: data.contactEmail,
      phone: data.contactPhone,
      externalId: data.contactExternalId || null,
    },
    select: { id: true },
  });
  return created.id;
}

export async function importOpportunitiesFromCsv(
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

  const ctx = await loadPipelineContext(tenantId);
  if (!ctx) {
    result.errors.push({
      row: 0,
      message: "Nenhum funil configurado. Crie um pipeline antes de importar.",
    });
    return result;
  }

  const pending: ParsedOpportunity[] = [];
  for (let i = 0; i < rows.length; i++) {
    const parsed = parseOpportunityRow(rows[i], i + 2);
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
          const stage = resolveStage(ctx, data.stageName);
          const contactId = await resolveOrCreateContact(tenantId, data);
          const closedAt =
            data.status === "won" || data.status === "lost"
              ? data.expectedCloseAt ?? new Date()
              : null;

          const existing = data.externalId
            ? await tx.opportunity.findFirst({
                where: { tenantId, externalId: data.externalId },
                select: { id: true },
              })
            : null;

          if (existing) {
            if (!updateExisting) {
              result.skipped++;
              continue;
            }
            await tx.opportunity.update({
              where: { id: existing.id },
              data: {
                title: data.title,
                value: data.value,
                status: data.status,
                stageId: stage.id,
                ...(contactId ? { contactId } : {}),
                expectedCloseAt: data.expectedCloseAt,
                closedAt,
                notes: data.notes,
              },
            });
            result.updated++;
          } else {
            await tx.opportunity.create({
              data: {
                tenantId,
                pipelineId: ctx.pipelineId,
                stageId: stage.id,
                contactId,
                title: data.title,
                value: data.value,
                status: data.status,
                expectedCloseAt: data.expectedCloseAt,
                closedAt,
                notes: data.notes,
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

export const OPPORTUNITIES_CSV_TEMPLATE = `titulo,valor,status,estagio,contato,email,telefone,data_prevista,observacoes,external_id
Proposta Acme,15000.00,open,Proposta,João Silva,joao@empresa.com,5511999887766,31/12/2026,Aguardando retorno,DEAL-001
Contrato Beta,42000.00,won,Fechado,Maria Santos,maria@empresa.com,5521988776655,01/06/2026,Fechado no trimestre,DEAL-002
`;
