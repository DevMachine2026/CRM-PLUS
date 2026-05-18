import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { can } from "@/lib/auth/permissions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, TrendingUp, User, Building2, Package,
  Calendar, Clock, FileText, Activity,
} from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const opp = await prisma.opportunity.findFirst({ where: { id }, select: { title: true } });
  return { title: opp ? `${opp.title} — CRM PLUS` : "Oportunidade — CRM PLUS" };
}

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  won:  "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = { open: "Aberta", won: "Ganha", lost: "Perdida" };

const ACTIVITY_ICON: Record<string, string> = {
  call: "📞", meeting: "🤝", email: "✉️", note: "📝", whatsapp: "💬", instagram: "📸",
};

export default async function OpportunityDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!can(session.user.role, "read", "opportunities")) redirect("/dashboard");

  const { id } = await params;

  const opp = await prisma.opportunity.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: {
      id: true, title: true, value: true, status: true, notes: true,
      expectedCloseAt: true, closedAt: true, createdAt: true, updatedAt: true,
      contact:      { select: { id: true, name: true, email: true } },
      company:      { select: { id: true, name: true } },
      stage:        { select: { id: true, name: true, probability: true } },
      pipeline:     { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
      products: {
        select: {
          id: true, quantity: true, unitPrice: true, totalPrice: true,
          product: { select: { id: true, name: true, category: true } },
        },
      },
      tasks: {
        orderBy: { dueAt: "asc" },
        take: 10,
        select: { id: true, title: true, status: true, priority: true, dueAt: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, type: true, title: true, description: true,
          scheduledAt: true, completedAt: true, createdAt: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!opp) notFound();

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: Date | null) => d ? d.toLocaleDateString("pt-BR") : "—";

  const totalProducts = opp.products.reduce((s, p) => s + Number(p.totalPrice), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/opportunities">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Oportunidades
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{opp.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{opp.pipeline.name}</span>
              <span>·</span>
              <span className="font-medium text-foreground">{opp.stage.name}</span>
              {opp.stage.probability > 0 && (
                <span className="text-xs">({opp.stage.probability}% prob.)</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`inline-block rounded-full px-3 py-0.5 text-sm font-medium ${STATUS_COLOR[opp.status] ?? ""}`}>
            {STATUS_LABEL[opp.status] ?? opp.status}
          </p>
          <p className="mt-1 text-2xl font-bold">{fmt(Number(opp.value ?? 0))}</p>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {opp.contact && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <User className="h-3 w-3" />Contato
              </div>
              <Link href={`/contacts/${opp.contact.id}`} className="text-sm font-medium hover:underline">
                {opp.contact.name}
              </Link>
            </CardContent>
          </Card>
        )}
        {opp.company && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Building2 className="h-3 w-3" />Empresa
              </div>
              <Link href={`/companies/${opp.company.id}`} className="text-sm font-medium hover:underline">
                {opp.company.name}
              </Link>
            </CardContent>
          </Card>
        )}
        {opp.assignedUser && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <User className="h-3 w-3" />Responsável
              </div>
              <p className="text-sm font-medium">{opp.assignedUser.name}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />Fechamento previsto
            </div>
            <p className="text-sm font-medium">{fmtDate(opp.expectedCloseAt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {opp.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{opp.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Products */}
      {opp.products.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />Produtos ({opp.products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {opp.products.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{p.product.name}</p>
                    {p.product.category && (
                      <p className="text-xs text-muted-foreground">{p.product.category}</p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{fmt(Number(p.totalPrice))}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity}x {fmt(Number(p.unitPrice))}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3">
                <p className="text-sm font-semibold">Total produtos</p>
                <p className="font-bold">{fmt(totalProducts)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      {opp.tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />Tarefas ({opp.tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {opp.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <span className={t.status === "done" ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                    <Badge variant={t.priority === "high" ? "destructive" : "outline"} className="text-[10px]">
                      {t.priority}
                    </Badge>
                  </div>
                  {t.dueAt && (
                    <span className="text-xs text-muted-foreground">{fmtDate(t.dueAt)}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {opp.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
          ) : (
            <ol className="relative border-l border-muted ml-3">
              {opp.activities.map((a) => (
                <li key={a.id} className="mb-5 ml-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">{ACTIVITY_ICON[a.type] ?? "•"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.title}</p>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.user?.name ?? "Sistema"} · {a.createdAt.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Criado em {fmtDate(opp.createdAt)} · Atualizado em {fmtDate(opp.updatedAt)}
        {opp.closedAt && ` · Fechado em ${fmtDate(opp.closedAt)}`}
      </p>
    </div>
  );
}
