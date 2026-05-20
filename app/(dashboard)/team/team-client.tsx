"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, Loader2, UserCheck, UserX, Shield, Users, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Fab } from "@/components/ui/fab";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type TeamUser = {
  id: string; name: string; email: string; phone: string | null;
  role: string; isActive: boolean; lastLoginAt: string | null; createdAt: string;
};

type Props = {
  users:        TeamUser[];
  currentUserId: string;
  canCreate:    boolean;
  canUpdate:    boolean;
  canDelete:    boolean;
};

const ASSIGNABLE_ROLES = ["owner", "manager", "salesperson", "attendant", "financial", "viewer"] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner", manager: "Gestor", salesperson: "Vendedor",
  attendant: "Atendente", financial: "Financeiro", viewer: "Visualizador",
  super_admin: "Super Admin",
};

const ROLE_COLOR: Record<string, string> = {
  owner:       "bg-purple-100 text-purple-800 border-purple-200",
  manager:     "bg-blue-100 text-blue-800 border-blue-200",
  salesperson: "bg-green-100 text-green-800 border-green-200",
  attendant:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  financial:   "bg-orange-100 text-orange-800 border-orange-200",
  viewer:      "bg-slate-100 text-slate-700 border-slate-200",
  super_admin: "bg-red-100 text-red-800 border-red-200",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium", ROLE_COLOR[role] ?? ROLE_COLOR.viewer)}>
      <Shield className="h-3 w-3" />
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

type MemberForm = { name: string; email: string; password: string; role: AssignableRole; phone: string };

function MemberDrawer({
  open, onClose, initial, isEdit, onSave,
}: {
  open: boolean; onClose: () => void;
  initial?: Partial<MemberForm> & { id?: string };
  isEdit: boolean;
  onSave: (data: MemberForm, id?: string) => Promise<string | null>;
}) {
  const [form, setForm] = useState<MemberForm>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    password: "",
    role: (initial?.role as AssignableRole) ?? "salesperson",
    phone: initial?.phone ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    setError("");
    const err = await onSave(form, initial?.id);
    if (err) { setError(err); setSaving(false); }
    else { onClose(); }
  }

  const f = (k: keyof MemberForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <FormDrawer
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={isEdit ? "Editar membro" : "Novo membro"}
      description={isEdit ? "Atualize nome, telefone e perfil." : "Convide alguém para o workspace."}
      submitLabel={isEdit ? "Salvar" : "Criar"}
      onSubmit={handleSubmit}
      loading={saving}
    >
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={form.name} onChange={f("name")} required minLength={2} />
      </div>
      {!isEdit && (
        <>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={f("email")} required />
          </div>
          <div className="space-y-1.5">
            <Label>Senha</Label>
            <Input type="password" value={form.password} onChange={f("password")} required minLength={8} placeholder="Mínimo 8 caracteres" />
          </div>
        </>
      )}
      <div className="space-y-1.5">
        <Label>Telefone</Label>
        <Input value={form.phone} onChange={f("phone")} placeholder="(opcional)" />
      </div>
      <div className="space-y-1.5">
        <Label>Perfil</Label>
        <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as AssignableRole }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </FormDrawer>
  );
}

function DeleteDialog({ user, onClose, onConfirm }: {
  user: TeamUser | null; onClose: () => void;
  onConfirm: (id: string) => Promise<string | null>;
}) {
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!user) return;
    setLoading(true); setError("");
    const err = await onConfirm(user.id);
    if (err) { setError(err); setLoading(false); }
    else      { onClose(); }
  }

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Remover Membro</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Deseja remover permanentemente <strong>{user?.name}</strong>? Esta ação não pode ser desfeita.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handle} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeamClient({ users: initialUsers, currentUserId, canCreate, canUpdate, canDelete }: Props) {
  const [users,      setUsers]      = useState<TeamUser[]>(initialUsers);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editUser,   setEditUser]   = useState<TeamUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<TeamUser | null>(null);
  const [q,          setQ]          = useState("");

  const filtered = q.trim()
    ? users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
    : users;

  async function handleCreate(form: MemberForm): Promise<string | null> {
    const res  = await apiFetch("/api/team", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role, phone: form.phone || undefined }),
    });
    const json = await res.json();
    if (!res.ok) return json.error ?? "Erro ao criar membro.";
    setUsers((prev) => [...prev, { ...json.data, lastLoginAt: null }]);
    return null;
  }

  async function handleEdit(form: MemberForm, id?: string): Promise<string | null> {
    if (!id) return "ID inválido.";
    const res  = await apiFetch(`/api/team/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, phone: form.phone || null, role: form.role }),
    });
    const json = await res.json();
    if (!res.ok) return json.error ?? "Erro ao atualizar.";
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...json.data } : u));
    return null;
  }

  async function handleToggleActive(user: TeamUser) {
    const res  = await apiFetch(`/api/team/${user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const json = await res.json();
    if (res.ok) setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
    else        alert(json.error ?? "Erro ao atualizar.");
  }

  async function handleDelete(id: string): Promise<string | null> {
    const res  = await apiFetch(`/api/team/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) return json.error ?? "Erro ao remover.";
    setUsers((prev) => prev.filter((u) => u.id !== id));
    return null;
  }

  function renderMemberActions(u: TeamUser) {
    return (
      <div className="flex items-center gap-1">
        {canUpdate && (
          <>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => setEditUser(u)} title="Editar" aria-label="Editar membro">
              <Pencil className="h-4 w-4" />
            </Button>
            {u.id !== currentUserId && (
              <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => handleToggleActive(u)} title={u.isActive ? "Desativar" : "Ativar"} aria-label={u.isActive ? "Desativar membro" : "Ativar membro"}>
                {u.isActive ? <UserX className="h-4 w-4 text-amber-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
              </Button>
            )}
          </>
        )}
        {canDelete && u.id !== currentUserId && (
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => setDeleteUser(u)} title="Remover" aria-label="Remover membro">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    );
  }

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Equipe"
        description={`${users.length} membro${users.length !== 1 ? "s" : ""} · ${activeCount} ativo${activeCount !== 1 ? "s" : ""}`}
        icon={<Users className="h-6 w-6 text-primary" />}
        action={canCreate ? (
          <PrimaryActionButton onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Novo membro
          </PrimaryActionButton>
        ) : undefined}
      />
      {canCreate && <Fab label="Novo membro" onClick={() => setShowAdd(true)} />}

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="min-h-11 pl-9" placeholder="Buscar por nome ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className={ds.listStack}>
        {filtered.length === 0 ? (
          <div className={ds.emptyState}>
            <p className="text-sm text-muted-foreground">
              {q ? "Nenhum membro encontrado para essa busca." : "Nenhum membro cadastrado."}
            </p>
          </div>
        ) : (
          filtered.map((u) => (
            <ListCard key={u.id}>
              <div className={cn("flex items-start justify-between gap-4", !u.isActive && "opacity-60")}>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-base font-semibold leading-snug">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">(você)</span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={u.role} />
                    {u.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-green-700"><UserCheck className="h-3.5 w-3.5" />Ativo</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-500"><UserX className="h-3.5 w-3.5" />Inativo</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Último acesso: {fmtDate(u.lastLoginAt)}</p>
                </div>
                {(canUpdate || canDelete) && <div className="shrink-0">{renderMemberActions(u)}</div>}
              </div>
            </ListCard>
          ))
        )}
      </div>

      {showAdd && (
        <MemberDrawer open={showAdd} onClose={() => setShowAdd(false)} isEdit={false} onSave={handleCreate} />
      )}
      {editUser && (
        <MemberDrawer
          open={!!editUser}
          onClose={() => setEditUser(null)}
          initial={{ id: editUser.id, name: editUser.name, role: editUser.role as AssignableRole, phone: editUser.phone ?? "" }}
          isEdit={true}
          onSave={handleEdit}
        />
      )}
      <DeleteDialog user={deleteUser} onClose={() => setDeleteUser(null)} onConfirm={handleDelete} />
    </div>
  );
}
