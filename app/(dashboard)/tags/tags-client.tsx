"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Tag as TagIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Fab } from "@/components/ui/fab";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string | null;
  createdAt: Date;
  _count: { contacts: number };
}

interface Props {
  tags: Tag[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#0d9488",
];

const EMPTY_FORM = { name: "", color: "#3b82f6" };

function TagBadge({ name, color }: { name: string; color: string | null }) {
  const bg = color ?? "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium text-white"
      style={{ backgroundColor: bg }}
    >
      {name}
    </span>
  );
}

export function TagsClient({ tags, canCreate, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openCreate() {
    setEditTag(null);
    setForm(EMPTY_FORM);
    setError("");
    setDrawerOpen(true);
  }

  function openEdit(t: Tag) {
    setEditTag(t);
    setForm({ name: t.name, color: t.color ?? "#64748b" });
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
      const url = editTag ? `/api/tags/${editTag.id}` : "/api/tags";
      const method = editTag ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), color: form.color }),
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
    if (!confirm(`Excluir a tag "${name}"? Ela será removida de todos os contatos.`))
      return;
    await apiFetch(`/api/tags/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  const filtered = q.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))
    : tags;

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Tags"
        description={`${tags.length} tag${tags.length !== 1 ? "s" : ""}`}
        action={
          canCreate ? (
            <PrimaryActionButton onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova tag
            </PrimaryActionButton>
          ) : undefined
        }
      />
      {canCreate && <Fab label="Nova tag" onClick={openCreate} />}

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tags…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-11 pl-9"
        />
      </div>

      <div className={ds.listStack}>
        {filtered.length === 0 ? (
          <div className={ds.emptyState}>
            <p className="text-sm text-muted-foreground">
              {q ? "Nenhuma tag encontrada." : "Nenhuma tag cadastrada ainda."}
            </p>
            {canCreate && !q && (
              <PrimaryActionButton className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nova tag
              </PrimaryActionButton>
            )}
          </div>
        ) : (
          filtered.map((t) => (
            <ListCard key={t.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <TagBadge name={t.name} color={t.color} />
                  <p className="text-sm text-muted-foreground">
                    {t._count.contacts} contato{t._count.contacts !== 1 ? "s" : ""} vinculado
                    {t._count.contacts !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={ds.touchTarget}
                      onClick={() => openEdit(t)}
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
                      onClick={() => handleDelete(t.id, t.name)}
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

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editTag ? "Editar tag" : "Nova tag"}
        description="Organize contatos com etiquetas coloridas."
        submitLabel={editTag ? "Salvar" : "Criar"}
        onSubmit={handleSave}
        loading={saving}
      >
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: cliente vip, urgente..."
          />
        </div>
        <div className="space-y-3">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="h-8 w-8 rounded-full border-2 transition-all duration-200"
                style={{
                  backgroundColor: c,
                  borderColor: form.color === c ? "var(--foreground)" : "transparent",
                  boxShadow: form.color === c ? `0 0 0 2px ${c}` : "none",
                }}
                onClick={() => setForm({ ...form, color: c })}
                aria-label={c}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <TagIcon className="h-4 w-4 text-muted-foreground" />
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: form.color }}
            >
              {form.name || "Prévia"}
            </span>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </FormDrawer>
    </div>
  );
}
