import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSession, unauthorized, forbidden, tenantWhere } from "@/lib/auth/get-session";

import { can } from "@/lib/auth/permissions";
import type { InvoiceStatus } from "@/lib/generated/prisma/enums";

const patchSchema = z.object({
  status:  z.enum(["draft", "sent", "paid", "cancelled", "overdue"]).optional(),
  notes:   z.string().max(1000).nullable().optional(),
  dueAt:   z.string().datetime().nullable().optional(),
  paidAt:  z.string().datetime().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/invoices/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "billing")) return forbidden();

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      items:   true,
      contact: { select: { id: true, name: true, email: true, phone: true } },
      company: { select: { id: true, name: true, phone: true, address: true } },
      revenue: { select: { id: true, amount: true, status: true, opportunity: { select: { title: true } } } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Fatura não encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      items: invoice.items.map((item) => ({
        ...item,
        unitPrice:  Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    },
  });
}

// PATCH /api/invoices/[id]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "billing")) return forbidden();

  const { id } = await params;

  const existing = await prisma.invoice.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Fatura não encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;

  // Auto-set paidAt when marking as paid
  const paidAt =
    d.status === "paid" && !existing.paidAt && d.paidAt === undefined
      ? new Date()
      : d.paidAt !== undefined
        ? d.paidAt ? new Date(d.paidAt) : null
        : undefined;

  const updated = await prisma.invoice.update({
    where: tenantWhere(session, id),
    data: {
      ...(d.status !== undefined ? { status: d.status as InvoiceStatus } : {}),
      ...(d.notes !== undefined  ? { notes: d.notes } : {}),
      ...(d.dueAt !== undefined  ? { dueAt: d.dueAt ? new Date(d.dueAt) : null } : {}),
      ...(paidAt !== undefined   ? { paidAt } : {}),
    },
  });

  return NextResponse.json({
    data: { ...updated, totalAmount: Number(updated.totalAmount) },
  });
}

// DELETE /api/invoices/[id]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "delete", "billing")) return forbidden();

  const { id } = await params;

  const existing = await prisma.invoice.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Fatura não encontrada." }, { status: 404 });
  }

  if (existing.status === "paid") {
    return NextResponse.json(
      { error: "Não é possível excluir uma fatura já paga." },
      { status: 422 }
    );
  }

  await prisma.invoice.delete({ where: tenantWhere(session, id) });
  return new NextResponse(null, { status: 204 });
}
