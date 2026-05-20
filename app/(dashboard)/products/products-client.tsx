"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
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
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/layout/filter-bar";
import { Fab } from "@/components/ui/fab";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type ProductStatus = "active" | "inactive";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  category: string | null;
  status: ProductStatus;
  createdAt: Date;
}

interface Props {
  products: Product[];
  total: number;
  page: number;
  search: string;
  statusFilter: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

const STATUS_VARIANTS: Record<ProductStatus, "default" | "outline"> = {
  active: "default",
  inactive: "outline",
};

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category: "",
  status: "active" as ProductStatus,
};

function formatPrice(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProductsClient({
  products,
  total,
  page,
  search,
  statusFilter,
  canCreate,
  canEdit,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function buildParams(overrides: Record<string, string> = {}) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (statusFilter) p.set("status", statusFilter);
    Object.entries(overrides).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    return p.toString();
  }

  function applySearch(value: string) {
    const p = new URLSearchParams();
    if (value) p.set("q", value);
    if (statusFilter) p.set("status", statusFilter);
    startTransition(() => router.push(`/products?${p}`));
  }

  function applyStatus(value: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (value && value !== "all") p.set("status", value);
    startTransition(() => router.push(`/products?${p}`));
  }

  function openCreate() {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setError("");
    setDrawerOpen(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(Number(p.price)),
      category: p.category ?? "",
      status: p.status,
    });
    setError("");
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    const price = parseFloat(form.price.replace(",", "."));
    if (isNaN(price) || price < 0) {
      setError("Preço inválido.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : "/api/products";
      const method = editProduct ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          price,
          category: form.category || null,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar.");
        return;
      }
      setDrawerOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"?`)) return;
    await apiFetch(`/api/products/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  const limit = 20;
  const pages = Math.ceil(total / limit);

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Produtos"
        description={`${total} produto${total !== 1 ? "s" : ""}`}
        action={
          canCreate ? (
            <PrimaryActionButton onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo produto
            </PrimaryActionButton>
          ) : undefined
        }
      />
      {canCreate && <Fab label="Novo produto" onClick={openCreate} />}

      <FilterBar>
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="min-h-11 pl-9"
            placeholder="Buscar por nome, categoria..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch(q)}
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => applyStatus(v ?? "all")}>
          <SelectTrigger className="min-h-11 w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <div className={ds.listStack}>
        {products.length === 0 ? (
          <div className={ds.emptyState}>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter
                ? "Nenhum produto encontrado."
                : "Nenhum produto cadastrado ainda."}
            </p>
            {canCreate && !search && !statusFilter && (
              <PrimaryActionButton className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Novo produto
              </PrimaryActionButton>
            )}
          </div>
        ) : (
          products.map((p) => (
            <ListCard key={p.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-base font-semibold">{p.name}</p>
                  {p.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                    {p.category && (
                      <span className="text-xs text-muted-foreground">{p.category}</span>
                    )}
                  </div>
                  <p className="text-lg font-semibold tabular-nums">{formatPrice(p.price)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={ds.touchTarget}
                      onClick={() => openEdit(p)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(ds.touchTarget, "text-destructive")}
                      onClick={() => handleDelete(p.id, p.name)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </ListCard>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page <= 1 || isPending}
              onClick={() => router.push(`/products?${buildParams({ page: String(page - 1) })}`)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page >= pages || isPending}
              onClick={() => router.push(`/products?${buildParams({ page: String(page + 1) })}`)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editProduct ? "Editar produto" : "Novo produto"}
        description="Catálogo usado em oportunidades e propostas."
        submitLabel={editProduct ? "Salvar" : "Criar"}
        onSubmit={handleSave}
        loading={saving}
      >
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Consultoria mensal"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Preço *</Label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-sm text-muted-foreground">R$</span>
            <Input
              className="min-h-11 pl-8"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0,00"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Serviços, Licenças..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição do produto ou serviço..."
            className="resize-none"
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as ProductStatus })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </FormDrawer>
    </div>
  );
}
