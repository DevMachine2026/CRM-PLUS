"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { Fab } from "@/components/ui/fab";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  domain: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  _count: { contacts: number };
}

interface Props {
  companies: Company[];
  total: number;
  page: number;
  search: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const EMPTY_FORM = { name: "", domain: "", phone: "", address: "", notes: "" };

export function CompaniesClient({
  companies,
  total,
  page,
  search,
  canCreate,
  canEdit,
  canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function applySearch(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    startTransition(() => router.push(`/companies?${params}`));
  }

  function openCreate() {
    setEditCompany(null);
    setForm(EMPTY_FORM);
    setError("");
    setDrawerOpen(true);
  }

  function openEdit(c: Company) {
    setEditCompany(c);
    setForm({
      name: c.name,
      domain: c.domain ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      notes: "",
    });
    setError("");
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editCompany
        ? `/api/companies/${editCompany.id}`
        : "/api/companies";
      const method = editCompany ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          domain: form.domain || null,
          phone: form.phone || null,
          address: form.address || null,
          notes: form.notes || null,
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
    if (!confirm(`Excluir "${name}"? Os contatos vinculados serão desvinculados.`))
      return;
    await apiFetch(`/api/companies/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  const limit = 20;
  const pages = Math.ceil(total / limit);

  const listContent =
    companies.length === 0 ? (
      <div className={ds.emptyState}>
        <p className="text-sm text-muted-foreground">
          {search
            ? "Nenhuma empresa encontrada."
            : "Nenhuma empresa cadastrada ainda."}
        </p>
        {canCreate && !search && (
          <PrimaryActionButton className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova empresa
          </PrimaryActionButton>
        )}
      </div>
    ) : (
      companies.map((c) => (
        <ListCard key={c.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                <p className="text-base font-semibold">{c.name}</p>
              </div>
              {c.domain && (
                <p className="text-sm text-muted-foreground">{c.domain}</p>
              )}
              {c.phone && (
                <p className="text-sm text-muted-foreground">{c.phone}</p>
              )}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {c._count.contacts} contato{c._count.contacts !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={ds.touchTarget}
                  onClick={() => openEdit(c)}
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
                  onClick={() => handleDelete(c.id, c.name)}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </ListCard>
      ))
    );

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Empresas"
        description={`${total} empresa${total !== 1 ? "s" : ""}`}
        action={
          canCreate ? (
            <PrimaryActionButton onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova empresa
            </PrimaryActionButton>
          ) : undefined
        }
      />
      {canCreate && <Fab label="Nova empresa" onClick={openCreate} />}

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="min-h-11 pl-9"
          placeholder="Buscar por nome, domínio ou telefone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch(q)}
        />
      </div>

      <div className={ds.listStack}>{listContent}</div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page <= 1 || isPending}
              onClick={() => {
                const p = new URLSearchParams();
                if (q) p.set("q", q);
                p.set("page", String(page - 1));
                router.push(`/companies?${p}`);
              }}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page >= pages || isPending}
              onClick={() => {
                const p = new URLSearchParams();
                if (q) p.set("q", q);
                p.set("page", String(page + 1));
                router.push(`/companies?${p}`);
              }}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editCompany ? "Editar empresa" : "Nova empresa"}
        description="Dados principais da conta. Você pode detalhar depois."
        submitLabel={editCompany ? "Salvar" : "Criar"}
        onSubmit={handleSave}
        loading={saving}
      >
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Acme Ltda"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Domínio</Label>
          <Input
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            placeholder="acme.com.br"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(11) 3000-0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Endereço</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Rua das Flores, 123 — São Paulo, SP"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Anotações sobre a empresa..."
            className="resize-none"
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </FormDrawer>
    </div>
  );
}
