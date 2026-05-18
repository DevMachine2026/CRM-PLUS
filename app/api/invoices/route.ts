import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { generateInvoice } from "@/lib/billing/generate-invoice";

const itemSchema = z.object({
  description: z.string().min(1).max(255),
  quantity:    z.number().int().min(1).max(9999),
  unitPrice:   z.number().min(0),
});

const createSchema = z.object({
  contactId:  z.string().uuid().optional(),
  companyId:  z.string().uuid().optional(),
  revenueId:  z.string().uuid().optional(),
  items:      z.array(itemSchema).min(1).max(50),
  notes:      z.string().max(1000).optional(),
  dueAt:      z.string().datetime().optional(),
  status:     z.enum(["draft", "sent", "paid", "cancelled", "overdue"]).optional(),
});

// GET /api/invoices
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "billing")) return forbidden();

  const { searchParams } = req.nextUrl;
  const page  = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 20;
  const status = searchParams.get("status") ?? undefined;

  const where = {
    tenantId: session.tenantId,
    ...(status ? { status: status as "draft" | "sent" | "paid" | "cancelled" | "overdue" } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id:          true,
        number:      true,
        status:      true,
        totalAmount: true,
        issuedAt:    true,
        dueAt:       true,
        paidAt:      true,
        createdAt:   true,
        contact:     { select: { id: true, name: true, email: true } },
        company:     { select: { id: true, name: true } },
        revenue:     { select: { id: true, amount: true, status: true } },
        _count:      { select: { items: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    data: invoices.map((inv) => ({ ...inv, totalAmount: Number(inv.totalAmount) })),
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

// POST /api/invoices
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "create", "billing")) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;

  try {
    const result = await generateInvoice({
      tenantId:  session.tenantId,
      contactId: d.contactId,
      companyId: d.companyId,
      revenueId: d.revenueId,
      items:     d.items,
      notes:     d.notes,
      dueAt:     d.dueAt ? new Date(d.dueAt) : undefined,
      status:    d.status,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao gerar fatura." },
      { status: 422 }
    );
  }
}
