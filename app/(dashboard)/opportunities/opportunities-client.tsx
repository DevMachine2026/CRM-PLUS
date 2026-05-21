"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Loader2, TrendingUp, Trophy, XCircle, Package, LayoutList, Kanban } from "lucide-react";
import { KanbanBoard } from "./kanban-board";
import type { KanbanOpportunity } from "@/lib/kanban/types";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/layout/filter-bar";
import { Fab } from "@/components/ui/fab";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, FormFieldRow } from "@/components/ui/form-field";
import { buildSelectItems, mapById, withNoneOption } from "@/lib/ui/select-items";

type OppStatus = "open" | "won" | "lost";

interface Stage {
  id: string;
  name: string;
  order: number;
  probability: number;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
}

interface OppProduct {
  id: string;
  quantity: number;
  unitPrice: unknown;
  totalPrice: unknown;
  productId: string;
  product: { id: string; name: string; category: string | null };
}

type Opportunity = Omit<KanbanOpportunity, "products"> & { products: OppProduct[] };

interface CatalogProduct {
  id: string;
  name: string;
  price: unknown;
  category: string | null;
}

interface Props {
  opportunities: Opportunity[];
  total: number;
  page: number;
  search: string;
  statusFilter: string;
  pipelineFilter: string;
  pipelines: Pipeline[];
  contacts: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  users: { id: string; name: string }[];
  allProducts: CatalogProduct[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const STATUS_LABELS: Record<OppStatus, string> = { open: "Aberta", won: "Ganha", lost: "Perdida" };
const STATUS_VARIANTS: Record<OppStatus, "default" | "secondary" | "outline" | "destructive"> = {
  open: "secondary",
  won: "default",
  lost: "destructive",
};
const STATUS_ICONS: Record<OppStatus, React.ReactNode> = {
  open: <TrendingUp className="h-3 w-3" />,
  won: <Trophy className="h-3 w-3" />,
  lost: <XCircle className="h-3 w-3" />,
};

function formatCurrency(value: unknown) {
  const n = Number(value);
  if (isNaN(n) || value === null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date | null | string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const EMPTY_FORM = {
  title: "",
  pipelineId: "",
  stageId: "",
  contactId: "",
  companyId: "",
  assignedUserId: "",
  value: "",
  status: "open" as OppStatus,
  expectedCloseAt: "",
  notes: "",
};

export function OpportunitiesClient({
  opportunities, total, page, search, statusFilter, pipelineFilter,
  pipelines, contacts, companies, users, allProducts,
  canCreate, canEdit, canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"table" | "kanban">("kanban");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      if (mq.matches) setView("table");
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [q, setQ] = useState(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // product management dialog state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogOpp, setProductDialogOpp] = useState<Opportunity | null>(null);
  const [addProductId, setAddProductId] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addUnitPrice, setAddUnitPrice] = useState("");
  const [productSaving, setProductSaving] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("1");
  const [editUnitPrice, setEditUnitPrice] = useState("");

  const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  const activePipeline = pipelineFilter
    ? pipelines.find((p) => p.id === pipelineFilter) ?? defaultPipeline
    : defaultPipeline;
  const selectedPipelineStages = pipelines.find((p) => p.id === form.pipelineId)?.stages ?? [];

  const pipelineSelectItems = buildSelectItems(mapById(pipelines));
  const stageSelectItems = buildSelectItems(
    selectedPipelineStages.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.probability}%)`,
    })),
  );
  const contactSelectItems = withNoneOption("Nenhum", mapById(contacts));
  const companySelectItems = withNoneOption("Nenhuma", mapById(companies));
  const userSelectItems = withNoneOption("Nenhum", mapById(users));
  const statusSelectItems = buildSelectItems(
    (["open", "won", "lost"] as const).map((s) => ({
      value: s,
      label: STATUS_LABELS[s],
    })),
  );

  function buildParams(overrides: Record<string, string> = {}) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (statusFilter) p.set("status", statusFilter);
    if (pipelineFilter) p.set("pipelineId", pipelineFilter);
    Object.entries(overrides).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    return p.toString();
  }

  function applyFilter(key: string, value: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (key !== "status" && statusFilter) p.set("status", statusFilter);
    if (key !== "pipelineId" && pipelineFilter) p.set("pipelineId", pipelineFilter);
    if (value && value !== "all") p.set(key, value);
    startTransition(() => router.push(`/opportunities?${p}`));
  }

  function openCreate(stageId?: string) {
    setEditOpp(null);
    const firstPipeline = defaultPipeline;
    setForm({
      ...EMPTY_FORM,
      pipelineId: firstPipeline?.id ?? "",
      stageId: stageId ?? firstPipeline?.stages[0]?.id ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  function openEdit(o: Opportunity) {
    setEditOpp(o);
    const pipeline = pipelines.find((p) => p.stages.some((s) => s.id === o.stage.id));
    setForm({
      title: o.title,
      pipelineId: pipeline?.id ?? "",
      stageId: o.stage.id,
      contactId: o.contact?.id ?? "",
      companyId: o.company?.id ?? "",
      assignedUserId: o.assignedUser?.id ?? "",
      value: o.value !== null && o.value !== undefined ? String(Number(o.value)) : "",
      status: o.status,
      expectedCloseAt: o.expectedCloseAt
        ? new Date(o.expectedCloseAt).toISOString().split("T")[0]
        : "",
      notes: "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setError("Título é obrigatório."); return; }
    if (!form.pipelineId) { setError("Selecione um pipeline."); return; }
    if (!form.stageId) { setError("Selecione uma etapa."); return; }

    const value = form.value ? parseFloat(form.value.replace(",", ".")) : null;
    if (form.value && (isNaN(value!) || value! < 0)) { setError("Valor inválido."); return; }

    setSaving(true);
    setError("");
    try {
      const url = editOpp ? `/api/opportunities/${editOpp.id}` : "/api/opportunities";
      const method = editOpp ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          pipelineId: form.pipelineId,
          stageId: form.stageId,
          contactId: form.contactId || null,
          companyId: form.companyId || null,
          assignedUserId: form.assignedUserId || null,
          value: value ?? null,
          status: form.status,
          expectedCloseAt: form.expectedCloseAt
            ? new Date(form.expectedCloseAt).toISOString()
            : null,
          notes: null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar.");
        return;
      }
      setDialogOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir "${title}"?`)) return;
    await apiFetch(`/api/opportunities/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  async function quickStatus(id: string, status: OppStatus) {
    await apiFetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    startTransition(() => router.refresh());
  }

  async function moveStage(oppId: string, stageId: string): Promise<boolean> {
    try {
      const res = await apiFetch(`/api/opportunities/${oppId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });
      if (!res.ok) return false;
      startTransition(() => router.refresh());
      return true;
    } catch {
      return false;
    }
  }

  function openProductDialog(o: Opportunity) {
    setProductDialogOpp(o);
    setAddProductId("");
    setAddQty("1");
    setAddUnitPrice("");
    setEditItemId(null);
    setProductDialogOpen(true);
  }

  function startEditItem(item: OppProduct) {
    setEditItemId(item.id);
    setEditQty(String(item.quantity));
    setEditUnitPrice(String(Number(item.unitPrice)));
  }

  async function handleAddProduct() {
    if (!productDialogOpp || !addProductId) return;
    const qty = parseInt(addQty);
    if (isNaN(qty) || qty < 1) return;
    setProductSaving(true);
    try {
      const body: Record<string, unknown> = { productId: addProductId, quantity: qty };
      if (addUnitPrice) body.unitPrice = parseFloat(addUnitPrice.replace(",", "."));
      await apiFetch(`/api/opportunities/${productDialogOpp.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setAddProductId("");
      setAddQty("1");
      setAddUnitPrice("");
      startTransition(() => router.refresh());
    } finally {
      setProductSaving(false);
    }
  }

  async function handleUpdateItem(oppId: string, productId: string) {
    const qty = parseInt(editQty);
    if (isNaN(qty) || qty < 1) return;
    setProductSaving(true);
    try {
      const body: Record<string, unknown> = { quantity: qty };
      if (editUnitPrice) body.unitPrice = parseFloat(editUnitPrice.replace(",", "."));
      await apiFetch(`/api/opportunities/${oppId}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setEditItemId(null);
      startTransition(() => router.refresh());
    } finally {
      setProductSaving(false);
    }
  }

  async function handleRemoveProduct(oppId: string, productId: string, name: string) {
    if (!confirm(`Remover "${name}" desta oportunidade?`)) return;
    await apiFetch(`/api/opportunities/${oppId}/products/${productId}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  const limit = 50;
  const pages = Math.ceil(total / limit);

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Oportunidades"
        description={`${total} oportunidade${total !== 1 ? "s" : ""}`}
        action={
          canCreate ? (
            <PrimaryActionButton onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Nova oportunidade
            </PrimaryActionButton>
          ) : undefined
        }
        toolbar={
          <div className="flex rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`flex min-h-11 items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`flex min-h-11 items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutList className="h-3.5 w-3.5" /> Lista
            </button>
          </div>
        }
      />
      {canCreate && <Fab label="Nova oportunidade" onClick={() => openCreate()} />}

      {/* Filters */}
      <FilterBar>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por título..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilter("q", q)}
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => applyFilter("status", v ?? "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertas</SelectItem>
            <SelectItem value="won">Ganhas</SelectItem>
            <SelectItem value="lost">Perdidas</SelectItem>
          </SelectContent>
        </Select>
        {pipelines.length > 1 && (
          <Select value={pipelineFilter || "all"} onValueChange={(v) => applyFilter("pipelineId", v ?? "all")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Pipeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funis</SelectItem>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FilterBar>

      {/* ── Kanban view ────────────────────────────────────────────────── */}
      {view === "kanban" && (
        <KanbanBoard
          opportunities={opportunities}
          stages={activePipeline?.stages ?? []}
          isLoading={isPending}
          canEdit={canEdit}
          canCreate={canCreate}
          onMoveStage={moveStage}
          onQuickWon={(id) => quickStatus(id, "won")}
          onQuickLost={(id) => quickStatus(id, "lost")}
          onOpenCreate={(stageId) => openCreate(stageId)}
          onOpenEdit={(id) => { const o = opportunities.find((x) => x.id === id); if (o) openEdit(o); }}
        />
      )}

      {/* ── Lista (modo tabela) ─────────────────────────────────────────── */}
      {view === "table" && (
        <div className={ds.listStack}>
          {opportunities.length === 0 ? (
            <div className={ds.emptyState}>
              <p className="text-sm text-muted-foreground">Nenhuma oportunidade encontrada.</p>
            </div>
          ) : (
            opportunities.map((o) => (
              <ListCard key={o.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-base font-semibold">{o.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANTS[o.status]} className="gap-1">
                        {STATUS_ICONS[o.status]}
                        {STATUS_LABELS[o.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {o.stage.name} · {o.stage.probability}%
                      </span>
                    </div>
                    {(o.contact || o.company) && (
                      <p className="text-sm text-muted-foreground">
                        {[o.contact?.name, o.company?.name].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="font-semibold tabular-nums">{formatCurrency(o.value)}</span>
                      <span className="text-muted-foreground">Fechamento: {formatDate(o.expectedCloseAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className={cn(ds.touchTarget, "relative")} title="Gerenciar produtos" onClick={() => openProductDialog(o)}>
                      <Package className="h-4 w-4" />
                      {o.products.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                          {o.products.length}
                        </span>
                      )}
                    </Button>
                    {canEdit && o.status === "open" && (
                      <>
                        <Button variant="ghost" size="icon" className={cn(ds.touchTarget, "text-green-600")} title="Ganha" onClick={() => quickStatus(o.id, "won")}>
                          <Trophy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn(ds.touchTarget, "text-destructive")} title="Perdida" onClick={() => quickStatus(o.id, "lost")}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="icon" className={ds.touchTarget} onClick={() => openEdit(o)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className={cn(ds.touchTarget, "text-destructive")} onClick={() => handleDelete(o.id, o.title)} aria-label="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </ListCard>
            ))
          )}
        </div>
      )}

      {view === "table" && pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" disabled={page <= 1 || isPending}
              onClick={() => router.push(`/opportunities?${buildParams({ page: String(page - 1) })}`)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={page >= pages || isPending}
              onClick={() => router.push(`/opportunities?${buildParams({ page: String(page + 1) })}`)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <FormDrawer
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editOpp ? "Editar oportunidade" : "Nova oportunidade"}
        description="Defina pipeline, etapa e valor estimado."
        submitLabel={editOpp ? "Salvar" : "Criar"}
        onSubmit={handleSave}
        loading={saving}
        className="max-w-lg"
      >
            <FormField>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Proposta para Acme Ltda" />
            </FormField>
            <FormFieldRow>
              <FormField>
                <Label>Pipeline *</Label>
                <Select
                  items={pipelineSelectItems}
                  value={form.pipelineId}
                  onValueChange={(v) => {
                    const pl = pipelines.find((p) => p.id === v);
                    setForm({ ...form, pipelineId: v ?? "", stageId: pl?.stages[0]?.id ?? "" });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => <SelectItem key={p.id} value={p.id} label={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField>
                <Label>Etapa *</Label>
                <Select
                  items={stageSelectItems}
                  value={form.stageId}
                  onValueChange={(v) => setForm({ ...form, stageId: v ?? "" })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {selectedPipelineStages.map((s) => (
                      <SelectItem key={s.id} value={s.id} label={`${s.name} (${s.probability}%)`}>
                        {s.name} ({s.probability}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormFieldRow>
            <FormFieldRow>
              <FormField>
                <Label>Contato</Label>
                <Select
                  items={contactSelectItems}
                  value={form.contactId || "none"}
                  onValueChange={(v) => setForm({ ...form, contactId: v === "none" ? "" : (v ?? "") })}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" label="Nenhum">Nenhum</SelectItem>
                    {contacts.map((c) => <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField>
                <Label>Empresa</Label>
                <Select
                  items={companySelectItems}
                  value={form.companyId || "none"}
                  onValueChange={(v) => setForm({ ...form, companyId: v === "none" ? "" : (v ?? "") })}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" label="Nenhuma">Nenhuma</SelectItem>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </FormFieldRow>
            <FormFieldRow>
              <FormField>
                <Label>Valor (R$)</Label>
                <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0,00" />
              </FormField>
              <FormField>
                <Label>Previsão de fechamento</Label>
                <Input type="date" value={form.expectedCloseAt} onChange={(e) => setForm({ ...form, expectedCloseAt: e.target.value })} />
              </FormField>
            </FormFieldRow>
            <FormFieldRow>
              <FormField>
                <Label>Responsável</Label>
                <Select
                  items={userSelectItems}
                  value={form.assignedUserId || "none"}
                  onValueChange={(v) => setForm({ ...form, assignedUserId: v === "none" ? "" : (v ?? "") })}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" label="Nenhum">Nenhum</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id} label={u.name}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField>
                <Label>Status</Label>
                <Select
                  items={statusSelectItems}
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: (v ?? "open") as OppStatus })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open" label="Aberta">Aberta</SelectItem>
                    <SelectItem value="won" label="Ganha">Ganha</SelectItem>
                    <SelectItem value="lost" label="Perdida">Perdida</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </FormFieldRow>
            <FormField>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações sobre a oportunidade..." className="resize-none" rows={2} />
            </FormField>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </FormDrawer>

      <Sheet open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <SheetContent className="max-w-lg">
          <SheetHeader>
            <SheetTitle>Produtos — {productDialogOpp?.title}</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {/* Existing items */}
            {productDialogOpp && productDialogOpp.products.length > 0 && (
              <div className="rounded-md border divide-y">
                {productDialogOpp.products.map((item) => (
                  <div key={item.id} className="px-3 py-2">
                    {editItemId === item.id ? (
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-sm font-medium truncate">{item.product.name}</span>
                        <Input
                          className="w-16 h-7 text-sm"
                          type="number"
                          min={1}
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          placeholder="Qtd"
                        />
                        <Input
                          className="w-24 h-7 text-sm"
                          value={editUnitPrice}
                          onChange={(e) => setEditUnitPrice(e.target.value)}
                          placeholder="Preço unit."
                        />
                        <Button size="sm" className="h-7 px-2" disabled={productSaving}
                          onClick={() => handleUpdateItem(productDialogOpp.id, item.productId)}>
                          {productSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditItemId(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity}× {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditItem(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveProduct(productDialogOpp.id, item.productId, item.product.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="px-3 py-2 bg-muted/30 flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(productDialogOpp.products.reduce((s, i) => s + Number(i.totalPrice), 0))}</span>
                </div>
              </div>
            )}

            {productDialogOpp && productDialogOpp.products.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum produto vinculado ainda.</p>
            )}

            {/* Add product */}
            {allProducts.length > 0 && canEdit && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adicionar produto</p>
                <div className="flex min-w-0 gap-2">
                  <Select
                    items={withNoneOption(
                      "Selecionar produto...",
                      allProducts
                        .filter((p) => !productDialogOpp?.products.some((i) => i.productId === p.id))
                        .map((p) => ({
                          value: p.id,
                          label: `${p.name} — ${formatCurrency(p.price)}`,
                        })),
                    )}
                    value={addProductId || "none"}
                    onValueChange={(v) => {
                      const id = v === "none" ? "" : (v ?? "");
                      setAddProductId(id);
                      const p = allProducts.find((x) => x.id === id);
                      if (p) setAddUnitPrice(String(Number(p.price)));
                    }}
                  >
                    <SelectTrigger className="min-w-0 flex-1">
                      <SelectValue placeholder="Selecionar produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" label="Selecionar produto...">Selecionar produto...</SelectItem>
                      {allProducts
                        .filter((p) => !productDialogOpp?.products.some((i) => i.productId === p.id))
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id} label={`${p.name} — ${formatCurrency(p.price)}`}>
                            {p.name} — {formatCurrency(p.price)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-16"
                    type="number"
                    min={1}
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    placeholder="Qtd"
                  />
                  <Input
                    className="w-28"
                    value={addUnitPrice}
                    onChange={(e) => setAddUnitPrice(e.target.value)}
                    placeholder="Preço unit."
                  />
                  <Button size="sm" disabled={!addProductId || productSaving} onClick={handleAddProduct}>
                    {productSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {allProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum produto ativo cadastrado. <a href="/products" className="underline">Cadastrar produtos</a>.
              </p>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setProductDialogOpen(false)}>Fechar</Button>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
