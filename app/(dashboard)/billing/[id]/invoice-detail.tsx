"use client";

import { useState, useTransition } from "react";
import {
  FileText, Building2, User, Calendar, CheckCircle2,
  XCircle, Clock, Pencil, Trash2, Loader2, ArrowLeft, Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled" | "overdue";

type InvoiceItem = {
  id:          string;
  description: string;
  quantity:    number;
  unitPrice:   number;
  totalPrice:  number;
  createdAt:   string;
};

type Invoice = {
  id:          string;
  number:      string;
  status:      InvoiceStatus;
  totalAmount: number;
  notes:       string | null;
  issuedAt:    string;
  dueAt:       string | null;
  paidAt:      string | null;
  createdAt:   string;
  updatedAt:   string;
  items:       InvoiceItem[];
  contact:     { id: string; name: string; email: string | null; phone: string | null } | null;
  company:     { id: string; name: string; phone: string | null; address: string | null } | null;
  revenue:     { id: string; amount: number; status: string; opportunity: { id: string; title: string } } | null;
};

type Props = {
  invoice:   Invoice;
  canUpdate: boolean;
  canDelete: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:     "Rascunho",
  sent:      "Enviada",
  paid:      "Paga",
  cancelled: "Cancelada",
  overdue:   "Vencida",
};

const STATUS_VARIANTS: Record<InvoiceStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft:     "secondary",
  sent:      "outline",
  paid:      "default",
  cancelled: "destructive",
  overdue:   "destructive",
};

const STATUS_ICONS: Record<InvoiceStatus, React.ComponentType<{ className?: string }>> = {
  draft:     Clock,
  sent:      FileText,
  paid:      CheckCircle2,
  cancelled: XCircle,
  overdue:   XCircle,
};

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoiceDetail({ invoice, canUpdate, canDelete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Edit form state
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const [notes,  setNotes]  = useState(invoice.notes ?? "");
  const [dueAt,  setDueAt]  = useState(invoice.dueAt ? invoice.dueAt.slice(0, 10) : "");

  const StatusIcon = STATUS_ICONS[invoice.status];

  async function handleSave() {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        notes: notes.trim() || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Erro ao atualizar fatura.");
      setSaving(false);
      return;
    }

    setEditOpen(false);
    setSaving(false);
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Erro ao excluir fatura.");
      setDeleteOpen(false);
      return;
    }

    router.push("/billing");
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{invoice.number}</h1>
              <Badge variant={STATUS_VARIANTS[invoice.status]} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {STATUS_LABELS[invoice.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Emitida em {fmtDate(invoice.issuedAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm" className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          {canUpdate && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
          {canDelete && invoice.status !== "paid" && (
            <Button
              variant="destructive" size="sm" className="gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Info cards */}
        <div className="md:col-span-1 space-y-4">
          {/* Contact */}
          {invoice.contact && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0.5">
                <p className="font-medium">{invoice.contact.name}</p>
                {invoice.contact.email && <p className="text-muted-foreground">{invoice.contact.email}</p>}
                {invoice.contact.phone && <p className="text-muted-foreground">{invoice.contact.phone}</p>}
              </CardContent>
            </Card>
          )}

          {/* Company */}
          {invoice.company && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-0.5">
                <p className="font-medium">{invoice.company.name}</p>
                {invoice.company.phone   && <p className="text-muted-foreground">{invoice.company.phone}</p>}
                {invoice.company.address && <p className="text-muted-foreground">{invoice.company.address}</p>}
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Emissão</span>
                <span>{fmtDate(invoice.issuedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencimento</span>
                <span>{fmtDate(invoice.dueAt)}</span>
              </div>
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span className="text-green-600">{fmtDate(invoice.paidAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opportunity link */}
          {invoice.revenue?.opportunity && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Oportunidade</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{invoice.revenue.opportunity.title}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Items table */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Itens da fatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium w-full">Descrição</th>
                    <th className="pb-2 font-medium text-center whitespace-nowrap px-3">Qtd.</th>
                    <th className="pb-2 font-medium text-right whitespace-nowrap">Preço unit.</th>
                    <th className="pb-2 font-medium text-right whitespace-nowrap pl-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-3">{item.description}</td>
                      <td className="py-2.5 text-center text-muted-foreground px-3">{item.quantity}</td>
                      <td className="py-2.5 text-right text-muted-foreground whitespace-nowrap">{fmt(item.unitPrice)}</td>
                      <td className="py-2.5 text-right font-medium whitespace-nowrap pl-3">{fmt(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={3} className="pt-3 text-right font-semibold text-muted-foreground">
                      Total
                    </td>
                    <td className="pt-3 text-right font-bold text-lg pl-3">
                      {fmt(invoice.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {invoice.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar fatura {invoice.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus((v ?? status) as InvoiceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due-at">Vencimento</Label>
              <input
                id="due-at"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Observações opcionais..."
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir fatura?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A fatura <strong>{invoice.number}</strong> será excluída permanentemente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
