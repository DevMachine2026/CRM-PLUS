import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Building2, Phone, Globe, MapPin, Users,
  TrendingUp, Receipt, FileText,
} from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const company = await prisma.company.findFirst({ where: { id }, select: { name: true } });
  return { title: company ? `${company.name} — CRM PLUS` : "Empresa — CRM PLUS" };
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  open: "default", won: "secondary", lost: "outline",
};
const STATUS_LABEL: Record<string, string> = { open: "Aberta", won: "Ganha", lost: "Perdida" };

const INV_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline", sent: "default", paid: "secondary", cancelled: "destructive", overdue: "destructive",
};
const INV_LABEL: Record<string, string> = {
  draft: "Rascunho", sent: "Enviada", paid: "Paga", cancelled: "Cancelada", overdue: "Vencida",
};

export default async function CompanyDetailPage({ params }: Props) {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "companies");

  const { id } = await params;

  const company = await prisma.company.findFirst({
    where: { id, tenantId: session.tenantId },
    select: {
      id: true, name: true, domain: true, phone: true, address: true, notes: true,
      createdAt: true,
      contacts: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, phone: true, status: true, leadScore: true },
      },
      opportunities: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, title: true, value: true, status: true, createdAt: true,
          stage: { select: { name: true } },
          contact: { select: { id: true, name: true } },
        },
      },
      invoices: {
        orderBy: { issuedAt: "desc" },
        take: 10,
        select: {
          id: true, number: true, totalAmount: true, status: true, issuedAt: true, dueAt: true,
        },
      },
    },
  });

  if (!company) notFound();

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");

  const totalRevenue = company.opportunities
    .filter((o) => o.status === "won")
    .reduce((s, o) => s + Number(o.value ?? 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/companies">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Empresas
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {company.phone && (
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{company.phone}</span>
            )}
            {company.domain && (
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{company.domain}</span>
            )}
            {company.address && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{company.address}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Receita total (ganho)</p>
          <p className="text-xl font-bold text-green-600">{fmt(totalRevenue)}</p>
        </div>
      </div>

      {/* Notes */}
      {company.notes && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground whitespace-pre-line">{company.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{company.contacts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Contatos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{company.opportunities.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Oportunidades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{company.invoices.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Faturas</p>
          </CardContent>
        </Card>
      </div>

      {/* Contacts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />Contatos ({company.contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {company.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contato vinculado.</p>
          ) : (
            <div className="divide-y">
              {company.contacts.map((c) => (
                <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center justify-between py-2 hover:bg-accent/40 rounded px-2 -mx-2 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
                    {c.leadScore > 0 && (
                      <span className={`text-xs font-semibold ${c.leadScore >= 70 ? "text-red-600" : c.leadScore >= 35 ? "text-yellow-600" : "text-blue-600"}`}>
                        {c.leadScore}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opportunities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />Oportunidades ({company.opportunities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {company.opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade.</p>
          ) : (
            <div className="divide-y">
              {company.opportunities.map((o) => (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="flex items-center justify-between py-2 hover:bg-accent/40 rounded px-2 -mx-2 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{o.title}</p>
                    <p className="text-xs text-muted-foreground">{o.stage.name}{o.contact ? ` · ${o.contact.name}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <Badge variant={STATUS_VARIANT[o.status] ?? "outline"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                    <span className="text-sm font-semibold">{fmt(Number(o.value ?? 0))}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      {can(session.role, "read", "billing") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />Faturas ({company.invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {company.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura.</p>
            ) : (
              <div className="divide-y">
                {company.invoices.map((inv) => (
                  <Link key={inv.id} href={`/billing/${inv.id}`} className="flex items-center justify-between py-2 hover:bg-accent/40 rounded px-2 -mx-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{inv.number}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(inv.issuedAt)}{inv.dueAt ? ` · vence ${fmtDate(inv.dueAt)}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={INV_VARIANT[inv.status] ?? "outline"}>{INV_LABEL[inv.status] ?? inv.status}</Badge>
                      <span className="text-sm font-semibold">{fmt(Number(inv.totalAmount))}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">Criado em {fmtDate(company.createdAt)}</p>
    </div>
  );
}
