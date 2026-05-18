"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, Loader2, UserCheck, UserX, Shield, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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

function MemberDialog({
  open, onClose, initial, isEdit, onSave,
}: {
  open: boolean; onClose: () => void;
  initial?: Partial<MemberForm> & { id?: string };
  isEdit: boolean;
  onSave: (data: MemberForm, id?: string) => Promise<string | null>;
}) {
  const [form, setForm] = useState<MemberForm>({
    name:     initial?.name     ?? "",
    email:    initial?.email    ?? "",
    password: "",
    role:     (initial?.role as AssignableRole) ?? "salesperson",
    phone:    initial?.phone    ?? "",
  });
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const err = await onSave(form, initial?.id);
    if (err) { setError(err); setSaving(false); }
    else      { onClose(); }
  }

  const f = (k: keyof MemberForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Membro" : "Novo Membro"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={form.name} onChange={f("name")} required minLength={2} />
          </div>
          {!isEdit && (
            <>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={f("email")} required />
              </div>
              <div className="space-y-1">
                <Label>Senha</Label>
                <Input type="password" value={form.password} onChange={f("password")} required minLength={8} placeholder="Mínimo 8 caracteres" />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={f("phone")} placeholder="(opcional)" />
          </div>
          <div className="space-y-1">
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
    const res  = await fetch("/api/team", {
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
    const res  = await fetch(`/api/team/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, phone: form.phone || null, role: form.role }),
    });
    const json = await res.json();
    if (!res.ok) return json.error ?? "Erro ao atualizar.";
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...json.data } : u));
    return null;
  }

  async function handleToggleActive(user: TeamUser) {
    const res  = await fetch(`/api/team/${user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const json = await res.json();
    if (res.ok) setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
    else        alert(json.error ?? "Erro ao atualizar.");
  }

  async function handleDelete(id: string): Promise<string | null> {
    const res  = await fetch(`/api/team/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) return json.error ?? "Erro ao remover.";
    setUsers((prev) => prev.filter((u) => u.id !== id));
    return null;
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />Novo Membro
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nome ou e-mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">{users.length} membro{users.length !== 1 ? "s" : ""}</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead>Criado em</TableHead>
                {(canUpdate || canDelete) && <TableHead className="w-28" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className={!u.isActive ? "opacity-60" : ""}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><RoleBadge role={u.role} /></TableCell>
                  <TableCell>
                    {u.isActive
                      ? <span className="flex items-center gap-1 text-xs text-green-700"><UserCheck className="h-3.5 w-3.5" />Ativo</span>
                      : <span className="flex items-center gap-1 text-xs text-slate-500"><UserX className="h-3.5 w-3.5" />Inativo</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{fmtDate(u.lastLoginAt)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{fmtDate(u.createdAt)}</TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canUpdate && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditUser(u)} title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {u.id !== currentUserId && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(u)} title={u.isActive ? "Desativar" : "Ativar"}>
                                {u.isActive
                                  ? <UserX className="h-3.5 w-3.5 text-amber-600" />
                                  : <UserCheck className="h-3.5 w-3.5 text-green-600" />}
                              </Button>
                            )}
                          </>
                        )}
                        {canDelete && u.id !== currentUserId && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteUser(u)} title="Remover">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {q ? "Nenhum membro encontrado para essa busca." : "Nenhum membro cadastrado."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showAdd && (
        <MemberDialog open={showAdd} onClose={() => setShowAdd(false)} isEdit={false} onSave={handleCreate} />
      )}
      {editUser && (
        <MemberDialog
          open={!!editUser} onClose={() => setEditUser(null)}
          initial={{ id: editUser.id, name: editUser.name, role: editUser.role as AssignableRole, phone: editUser.phone ?? "" }}
          isEdit={true} onSave={handleEdit}
        />
      )}
      <DeleteDialog user={deleteUser} onClose={() => setDeleteUser(null)} onConfirm={handleDelete} />
    </div>
  );
}
