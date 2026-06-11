"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Loader2, Tag as TagIcon, X, MessageSquare } from "lucide-react";
import { WhatsAppOpenButton } from "@/components/ui/whatsapp-open-button";
import { resolveContactWhatsAppPhone } from "@/lib/utils/whatsapp";
import { formatPhone } from "@/lib/utils/format";
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
import { Fab } from "@/components/ui/fab";
import { FormDrawer } from "@/components/ui/form-drawer";
import { FormField } from "@/components/ui/form-field";
import { buildSelectItems } from "@/lib/ui/select-items";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ContactStatus = "lead" | "customer" | "inactive";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
  status: ContactStatus;
  leadScore: number | null;
  createdAt: Date;
  tags: Tag[];
  conversations: { id: string }[];
}

interface Props {
  contacts: Contact[];
  allTags: Tag[];
  total: number;
  page: number;
  search: string;
  statusFilter: string;
  channelFilter: string;
  scoreFilter: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: "Lead",
  customer: "Cliente",
  inactive: "Inativo",
};

const STATUS_VARIANTS: Record<ContactStatus, "default" | "secondary" | "outline"> = {
  lead: "default",
  customer: "secondary",
  inactive: "outline",
};

const EMPTY_FORM = { name: "", email: "", phone: "", status: "lead" as ContactStatus };

function ScoreBadge({ score }: { score: number }) {
  if (!score) {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500"
        title="Lead ainda não classificado pela IA"
      >
        ⚪ Novo
      </span>
    );
  }
  const isHot  = score >= 70;
  const isWarm = score >= 35;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
        isHot  ? "bg-red-100 text-red-700" :
        isWarm ? "bg-yellow-100 text-yellow-700" :
                 "bg-blue-100 text-blue-700"
      }`}
    >
      {isHot ? "🔴" : isWarm ? "🟡" : "🔵"} {score}
    </span>
  );
}

export function ContactsClient({ contacts, allTags, total, page, search, statusFilter, channelFilter, scoreFilter, canCreate, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tagContact, setTagContact] = useState<Contact | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);

  function pushFilters(overrides: Record<string, string> = {}) {
    const next = {
      q,
      status: statusFilter,
      channel: channelFilter,
      score: scoreFilter,
      page: "",
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.status) params.set("status", next.status);
    if (next.channel) params.set("channel", next.channel);
    if (next.score) params.set("score", next.score);
    if (next.page && next.page !== "1") params.set("page", next.page);
    startTransition(() => router.push(`/contacts?${params}`));
  }

  function applySearch(value: string) {
    pushFilters({ q: value });
  }

  function openCreate() {
    setEditContact(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(c: Contact) {
    setEditContact(c);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "", status: c.status });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true);
    setError("");
    try {
      const url = editContact ? `/api/contacts/${editContact.id}` : "/api/contacts";
      const method = editContact ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email: form.email || null, phone: form.phone || null }),
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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"?`)) return;
    await apiFetch(`/api/contacts/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  function openTagDialog(c: Contact) {
    setTagContact(c);
    setTagDialogOpen(true);
  }

  async function addTag(contactId: string, tagId: string) {
    await apiFetch(`/api/contacts/${contactId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    startTransition(() => router.refresh());
  }

  async function removeTag(contactId: string, tagId: string) {
    await apiFetch(`/api/contacts/${contactId}/tags/${tagId}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  const limit = 20;
  const pages = Math.ceil(total / limit);

  const listContent =
    contacts.length === 0 ? (
      <div className={ds.emptyState}>
        <p className="text-sm text-muted-foreground">
          {search ? "Nenhum contato encontrado." : "Nenhum contato cadastrado ainda."}
        </p>
        {canCreate && !search && (
          <PrimaryActionButton className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo contato
          </PrimaryActionButton>
        )}
      </div>
    ) : (
      contacts.map((c) => {
        const waPhone = resolveContactWhatsAppPhone(c);
        const waConvId = c.conversations[0]?.id;

        return (
        <ListCard key={c.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Link
                href={`/contacts/${c.id}`}
                className="text-base font-semibold hover:underline"
              >
                {c.name}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <ScoreBadge score={c.leadScore ?? 0} />
                <Badge variant={STATUS_VARIANTS[c.status]}>
                  {STATUS_LABELS[c.status]}
                </Badge>
                {waConvId && (
                  <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                    WhatsApp
                  </Badge>
                )}
              </div>
              {c.email && (
                <p className="text-sm text-muted-foreground">{c.email}</p>
              )}
              {waPhone ? (
                <p className="text-sm text-muted-foreground">
                  {formatPhone(waPhone)}
                </p>
              ) : waConvId ? (
                <p className="text-xs text-amber-700">
                  Telefone não cadastrado — edite o contato ou corrija o webhook Make.
                </p>
              ) : null}
              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {c.tags.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: t.color ?? "#64748b" }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              {waPhone && (
                <WhatsAppOpenButton
                  phone={waPhone}
                  variant="icon"
                  className="h-10 w-10 text-green-600"
                />
              )}
              {!waPhone && waConvId && (
                <Link
                  href={`/inbox?convId=${waConvId}`}
                  title="Ver conversa WhatsApp"
                  aria-label="Ver conversa WhatsApp"
                  className={cn(
                    ds.touchTarget,
                    "inline-flex items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50",
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                </Link>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={ds.touchTarget}
                  title="Gerenciar tags"
                  onClick={() => openTagDialog(c)}
                >
                  <TagIcon className="h-4 w-4" />
                </Button>
              )}
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
        );
      })
    );

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Contatos"
        description={`${total} contato${total !== 1 ? "s" : ""}`}
        action={
          canCreate ? (
            <PrimaryActionButton onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo contato
            </PrimaryActionButton>
          ) : undefined
        }
      />
      {canCreate && <Fab label="Novo contato" onClick={openCreate} />}

      {/* Search + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch(q)}
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => pushFilters({ status: !v || v === "all" ? "" : v })}>
          <SelectTrigger className="h-9 w-32 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="customer">Cliente</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={channelFilter || "all"} onValueChange={(v) => pushFilters({ channel: !v || v === "all" ? "" : v })}>
          <SelectTrigger className="h-9 w-32 text-sm"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos canais</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scoreFilter || "all"} onValueChange={(v) => pushFilters({ score: !v || v === "all" ? "" : v })}>
          <SelectTrigger className="h-9 w-32 text-sm"><SelectValue placeholder="Score" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos scores</SelectItem>
            <SelectItem value="hot">🔴 Quente (70+)</SelectItem>
            <SelectItem value="warm">🟡 Morno (35–69)</SelectItem>
            <SelectItem value="cold">🔵 Frio (&lt;35)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={ds.listStack}>{listContent}</div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isPending}
              onClick={() => pushFilters({ page: String(page - 1) })}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages || isPending}
              onClick={() => pushFilters({ page: String(page + 1) })}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <FormDrawer
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editContact ? "Editar contato" : "Novo contato"}
        description="Preencha os dados essenciais. Você pode completar depois."
        submitLabel={editContact ? "Salvar" : "Criar"}
        onSubmit={handleSave}
        loading={saving}
      >
        <FormField>
          <Label>Nome *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="João Silva" />
        </FormField>
        <FormField>
          <Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="joao@empresa.com" />
        </FormField>
        <FormField>
          <Label>Telefone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
        </FormField>
        <FormField>
          <Label>Status</Label>
          <Select
            items={buildSelectItems([
              { value: "lead", label: "Lead" },
              { value: "customer", label: "Cliente" },
              { value: "inactive", label: "Inativo" },
            ])}
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as ContactStatus })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lead" label="Lead">Lead</SelectItem>
              <SelectItem value="customer" label="Cliente">Cliente</SelectItem>
              <SelectItem value="inactive" label="Inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </FormDrawer>

      <Sheet open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <SheetContent className="max-w-sm">
          <SheetHeader>
            <SheetTitle>Tags — {tagContact?.name}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {allTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada. <a href="/tags" className="underline">Criar tags</a>.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTags.map((t) => {
                  const applied = tagContact?.tags.some((ct) => ct.id === t.id) ?? false;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (!tagContact) return;
                        if (applied) removeTag(tagContact.id, t.id);
                        else addTag(tagContact.id, t.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200"
                      style={{
                        backgroundColor: applied ? (t.color ?? "#64748b") : "transparent",
                        color: applied ? "white" : (t.color ?? "#64748b"),
                        border: `2px solid ${t.color ?? "#64748b"}`,
                      }}
                    >
                      {applied && <X className="h-3 w-3" />}
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}