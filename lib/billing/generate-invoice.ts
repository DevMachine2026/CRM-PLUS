import { prisma } from "@/lib/db/client";
import type { InvoiceStatus } from "@/lib/generated/prisma/enums";

export interface InvoiceItemInput {
  description: string;
  quantity:    number;
  unitPrice:   number;
}

export interface GenerateInvoiceInput {
  tenantId:   string;
  contactId?: string;
  companyId?: string;
  revenueId?: string;
  items:      InvoiceItemInput[];
  notes?:     string;
  dueAt?:     Date;
  status?:    InvoiceStatus;
}

export interface GenerateInvoiceResult {
  invoiceId:    string;
  invoiceNumber: string;
  totalAmount:  number;
}

// ── Sequential number generation ──────────────────────────────────────────────
// Format: INV-YYYY-NNNN (e.g. INV-2026-0001)
// Counter resets per year, scoped to tenant.

async function nextInvoiceNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Count invoices for this tenant in the current year
  const count = await prisma.invoice.count({
    where: {
      tenantId,
      number: { startsWith: prefix },
    },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function generateInvoice(
  input: GenerateInvoiceInput
): Promise<GenerateInvoiceResult> {
  if (input.items.length === 0) {
    throw new Error("Invoice must have at least one item.");
  }

  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const invoiceNumber = await nextInvoiceNumber(input.tenantId);

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        tenantId:    input.tenantId,
        number:      invoiceNumber,
        contactId:   input.contactId ?? null,
        companyId:   input.companyId ?? null,
        revenueId:   input.revenueId ?? null,
        status:      input.status ?? "draft",
        totalAmount,
        notes:       input.notes ?? null,
        dueAt:       input.dueAt ?? null,
        items: {
          create: input.items.map((item) => ({
            tenantId:   input.tenantId,
            description: item.description,
            quantity:    item.quantity,
            unitPrice:   item.unitPrice,
            totalPrice:  item.quantity * item.unitPrice,
          })),
        },
      },
    });
    return inv;
  });

  return {
    invoiceId:     invoice.id,
    invoiceNumber: invoice.number,
    totalAmount,
  };
}

// ── Generate from Revenue ─────────────────────────────────────────────────────
// Convenience: create an invoice directly from an existing Revenue record.

export async function generateInvoiceFromRevenue(
  revenueId: string,
  tenantId:  string
): Promise<GenerateInvoiceResult> {
  const revenue = await prisma.revenue.findFirst({
    where: { id: revenueId, tenantId },
    select: {
      id:           true,
      amount:       true,
      description:  true,
      dueAt:        true,
      contactId:    true,
      companyId:    true,
      opportunity:  { select: { title: true } },
      invoice:      { select: { id: true, number: true } },
    },
  });

  if (!revenue) throw new Error("Revenue not found.");
  if (revenue.invoice) {
    return {
      invoiceId:     revenue.invoice.id,
      invoiceNumber: revenue.invoice.number,
      totalAmount:   Number(revenue.amount),
    };
  }

  return generateInvoice({
    tenantId,
    contactId: revenue.contactId ?? undefined,
    companyId: revenue.companyId ?? undefined,
    revenueId: revenue.id,
    items: [
      {
        description: revenue.description ?? revenue.opportunity.title ?? "Serviço",
        quantity:    1,
        unitPrice:   Number(revenue.amount),
      },
    ],
    dueAt:  revenue.dueAt ?? undefined,
    status: "sent",
  });
}
