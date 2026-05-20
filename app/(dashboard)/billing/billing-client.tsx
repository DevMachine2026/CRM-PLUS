"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle, Loader2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { FilterBar } from "@/components/layout/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Revenue = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  description: string | null;
  paidAt: Date | null;
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  opportunity: { id: string; title: string } | null;
  contact: { id: string; name: string; email: string | null } | null;
  company: { id: string; name: string } | null;
};

type Props = {
  revenues: Revenue[];
  total: number;
  page: number;
  limit: number;
  canUpdate: boolean;
};

const STATUS_LABEL: Record<Revenue["status"], string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
};

const STATUS_VARIANT: Record<Revenue["status"], "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  paid: "default",
  cancelled: "destructive",
};

const STATUS_ICON: Record<Revenue["status"], React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  paid: <CheckCircle2 className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

function fmt(amount: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

function fmtDate(date: Date | string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export function BillingClient({ revenues, total, page, limit, canUpdate }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [editStatus, setEditStatus] = useState<Revenue["status"]>("pending");
  const [editPaidAt, setEditPaidAt] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const pages = Math.ceil(total / limit);
  const totalAmount = revenues.reduce((sum, r) => sum + r.amount, 0);
  const paidAmount = revenues.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0);

  function pushParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete("page");
    startTransition(() => router.push(`?${p.toString()}`));
  }

  function openEdit(rev: Revenue) {
    setEditingRevenue(rev);
    setEditStatus(rev.status);
    setEditPaidAt(rev.paidAt ? new Date(rev.paidAt).toISOString().slice(0, 16) : "");
    setEditDueAt(rev.dueAt ? new Date(rev.dueAt).toISOString().slice(0, 16) : "");
    setEditDescription(rev.description ?? "");
    setError("");
  }

  async function handleSave() {
    if (!editingRevenue) return;
    setIsSaving(true);
    setError("");
    try {
      const res = await apiFetch(`/api/revenues/${editingRevenue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          paidAt: editPaidAt ? new Date(editPaidAt).toISOString() : null,
          dueAt: editDueAt ? new Date(editDueAt).toISOString() : null,
          description: editDescription || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao salvar.");
        return;
      }
      setEditingRevenue(null);
      startTransition(() => router.refresh());
    } catch {
      setError("Erro de rede.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Faturamento"
        description="Receitas vinculadas às oportunidades"
        icon={<DollarSign className="h-6 w-6" />}
      />

      <MetricGrid>
        <MetricCard label="Total (página)" value={fmt(totalAmount)} />
        <MetricCard label="Pago (página)" value={fmt(paidAmount)} valueClassName="text-green-600" />
        <MetricCard label="Registros" value={total} />
        <MetricCard label="Página" value={`${page} / ${pages || 1}`} />
      </MetricGrid>

      <FilterBar className="items-end">
        <div className="w-full sm:w-40">
          <Select
            value={searchParams.get("status") ?? "all"}
            onValueChange={(v) => pushParam("status", !v || v === "all" ? "" : v)}
          >
            <SelectTrigger className="min-h-11">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="date"
            className="min-h-11 w-full sm:w-36"
            defaultValue={searchParams.get("dateFrom") ?? ""}
            onChange={(e) => pushParam("dateFrom", e.target.value)}
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            className="min-h-11 w-full sm:w-36"
            defaultValue={searchParams.get("dateTo") ?? ""}
            onChange={(e) => pushParam("dateTo", e.target.value)}
          />
        </div>
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </FilterBar>

      <div className={ds.listStack}>
        {revenues.length === 0 ? (
          <div className={ds.emptyState}>
            <p className="text-sm text-muted-foreground">Nenhum faturamento encontrado.</p>
          </div>
        ) : (
          revenues.map((rev) => (
            <ListCard
              key={rev.id}
              onClick={canUpdate ? () => openEdit(rev) : undefined}
              className={canUpdate ? undefined : ""}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-base font-semibold leading-snug">
                    {rev.opportunity?.title ?? "Sem oportunidade"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {rev.contact?.name ?? rev.company?.name ?? "—"}
                  </p>
                  {rev.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{rev.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANT[rev.status]} className="flex items-center gap-1">
                      {STATUS_ICON[rev.status]}
                      {STATUS_LABEL[rev.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Pago: {fmtDate(rev.paidAt)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Criado: {fmtDate(rev.createdAt)}
                    </span>
                  </div>
                </div>
                <p className="shrink-0 text-lg font-semibold tabular-nums">{fmt(rev.amount)}</p>
              </div>
            </ListCard>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" disabled={page <= 1} onClick={() => pushParam("page", String(page - 1))}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {pages}</span>
          <Button variant="outline" size="sm" className="rounded-xl" disabled={page >= pages} onClick={() => pushParam("page", String(page + 1))}>
            Próxima
          </Button>
        </div>
      )}

      <FormDrawer
        open={!!editingRevenue}
        onOpenChange={(open) => { if (!open) setEditingRevenue(null); }}
        title="Editar faturamento"
        description="Atualize status e datas de pagamento."
        submitLabel="Salvar"
        onSubmit={handleSave}
        loading={isSaving}
      >
        {editingRevenue && (
          <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
            <span className="font-semibold">{editingRevenue.opportunity?.title}</span>
            <span className="text-muted-foreground"> · {fmt(editingRevenue.amount)}</span>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={editStatus} onValueChange={(v) => setEditStatus(v as Revenue["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Data de pagamento</Label>
          <Input type="datetime-local" value={editPaidAt} onChange={(e) => setEditPaidAt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Data de vencimento</Label>
          <Input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descrição opcional" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </FormDrawer>
    </div>
  );
}
