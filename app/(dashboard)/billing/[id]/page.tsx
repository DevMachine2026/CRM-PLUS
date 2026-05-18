import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { redirect, notFound } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { InvoiceDetail } from "./invoice-detail";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id },
    select: { number: true },
  });
  return { title: invoice ? `Fatura ${invoice.number} — CRM PLUS` : "Fatura — CRM PLUS" };
}

export default async function InvoicePage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!can(session.user.role, "read", "billing")) redirect("/dashboard");

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      items:   { orderBy: { createdAt: "asc" } },
      contact: { select: { id: true, name: true, email: true, phone: true } },
      company: { select: { id: true, name: true, phone: true, address: true } },
      revenue: {
        select: {
          id: true,
          amount: true,
          status: true,
          opportunity: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!invoice) notFound();

  const canUpdate = can(session.user.role, "update", "billing");
  const canDelete = can(session.user.role, "delete", "billing");

  return (
    <InvoiceDetail
      invoice={{
        ...invoice,
        totalAmount: Number(invoice.totalAmount),
        issuedAt: invoice.issuedAt.toISOString(),
        dueAt: invoice.dueAt?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
        items: invoice.items.map((item) => ({
          ...item,
          unitPrice:  Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          createdAt:  item.createdAt.toISOString(),
        })),
        revenue: invoice.revenue
          ? { ...invoice.revenue, amount: Number(invoice.revenue.amount) }
          : null,
      }}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}
