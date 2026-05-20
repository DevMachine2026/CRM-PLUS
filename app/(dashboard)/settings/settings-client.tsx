"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition } from "react";
import {
  Building2, Users, Save, Plus, Pencil, Trash2,
  Loader2, UserCheck, UserX, Shield, Wand2, CheckCircle2, Plug,
} from "lucide-react";
import Link from "next/link";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Badge }    from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { mobileLayout } from "@/lib/mobile-design";
import { ds } from "@/lib/design-system";
import { AiAgentConfig } from "@/components/settings/ai-agent-config";
import type { TenantAiSettings } from "@/lib/ai/tenant-settings";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tenant = {
  id: string; name: string; slug: string;
  plan: string; status: string; createdAt: string;
};

type TeamUser = {
  id: string; name: string; email: string; phone: string | null;
  role: string; isActive: boolean;
  lastLoginAt: string | null; createdAt: string;
};

type Props = {
  tenant:             Tenant;
  aiSettings:         TenantAiSettings;
  users:              TeamUser[];
  currentUserId:      string;
  canUpdateSettings:  boolean;
  canReadTeam:        boolean;
  canCreateTeam:      boolean;
  canUpdateTeam:      boolean;
  canDeleteTeam:      boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ASSIGNABLE_ROLES = ["owner", "manager", "salesperson", "attendant", "financial", "viewer"] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

const ROLE_LABEL: Record<string, string> = {
  owner:       "Owner",
  manager:     "Gestor",
  salesperson: "Vendedor",
  attendant:   "Atendente",
  financial:   "Financeiro",
  viewer:      "Visualizador",
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

const PLAN_LABEL: Record<string, string> = {
  free: "Gratuito", starter: "Starter", pro: "Pro", enterprise: "Enterprise",
};
const STATUS_LABEL: Record<string, string> = { active: "Ativo", suspended: "Suspenso", cancelled: "Cancelado" };

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

// ── Role badge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium", ROLE_COLOR[role] ?? ROLE_COLOR.viewer)}>
      <Shield className="h-3 w-3" />
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

// ── Add/Edit member dialog ────────────────────────────────────────────────────

type MemberForm = {
  name: string; email: string; password: string;
  role: AssignableRole; phone: string;
};

function MemberDrawer({
  open, onClose, initial, isEdit,
  onSave,
}: {
  open:     boolean;
  onClose:  () => void;
  initial?: Partial<MemberForm> & { id?: string };
  isEdit:   boolean;
  onSave:   (data: MemberForm, id?: string) => Promise<string | null>;
}) {
  const [form, setForm] = useState<MemberForm>({
    name:     initial?.name     ?? "",
    email:    initial?.email    ?? "",
    password: "",
    role:     (initial?.role as AssignableRole) ?? "salesperson",
    phone:    initial?.phone    ?? "",
  });
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);

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

// ── Delete confirm dialog ──────────────────────────────────────────────────────

function DeleteDialog({
  user, onClose, onConfirm,
}: {
  user:      TeamUser | null;
  onClose:   () => void;
  onConfirm: (id: string) => Promise<string | null>;
}) {
  const [error,  setError]  = useState("");
  const [loading, setLoading] = useState(false);
  const [, startT] = useTransition();

  async function handle() {
    if (!user) return;
    setLoading(true); setError("");
    startT(async () => {
      const err = await onConfirm(user.id);
      if (err) { setError(err); setLoading(false); }
      else      { onClose(); }
    });
  }

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover Membro</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Deseja remover permanentemente <strong>{user?.name}</strong>?
          Esta ação não pode ser desfeita.
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

// ── Main component ─────────────────────────────────────────────────────────────

export function SettingsClient({
  tenant, aiSettings, users: initialUsers, currentUserId,
  canUpdateSettings, canReadTeam, canCreateTeam, canUpdateTeam, canDeleteTeam,
}: Props) {
  const [tab, setTab] = useState<"empresa" | "equipe">("empresa");

  // ── Empresa state ────────────────────────────────────────────────────────────
  const [tenantName, setTenantName] = useState(tenant.name);
  const [nameInput,  setNameInput]  = useState(tenant.name);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError,  setNameError]  = useState("");
  const [nameOk,     setNameOk]     = useState(false);

  async function saveName() {
    setNameSaving(true); setNameError(""); setNameOk(false);
    try {
      const res  = await apiFetch("/api/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: nameInput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar.");
      setTenantName(json.data.name);
      setNameOk(true);
    } catch (e: unknown) {
      setNameError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setNameSaving(false);
    }
  }

  // ── Setup state ──────────────────────────────────────────────────────────────
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupOk,      setSetupOk]      = useState(false);
  const [setupError,   setSetupError]   = useState("");

  async function runSetup() {
    setSetupLoading(true); setSetupOk(false); setSetupError("");
    try {
      const res  = await apiFetch("/api/settings/setup", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao provisionar.");
      setSetupOk(true);
    } catch (e: unknown) {
      setSetupError(e instanceof Error ? e.message : "Erro ao provisionar.");
    } finally {
      setSetupLoading(false);
    }
  }

  // ── Team state ───────────────────────────────────────────────────────────────
  const [users,      setUsers]      = useState<TeamUser[]>(initialUsers);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editUser,   setEditUser]   = useState<TeamUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<TeamUser | null>(null);

  async function handleCreate(form: MemberForm): Promise<string | null> {
    const res  = await apiFetch("/api/team", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role,
        phone:    form.phone || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) return json.error ?? "Erro ao criar membro.";
    setUsers((prev) => [...prev, { ...json.data, lastLoginAt: null }]);
    return null;
  }

  async function handleEdit(form: MemberForm, id?: string): Promise<string | null> {
    if (!id) return "ID inválido.";
    const res  = await apiFetch(`/api/team/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:  form.name,
        phone: form.phone || null,
        role:  form.role,
      }),
    });
    const json = await res.json();
    if (!res.ok) return json.error ?? "Erro ao atualizar.";
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...json.data } : u));
    return null;
  }

  async function handleToggleActive(user: TeamUser): Promise<void> {
    const res  = await apiFetch(`/api/team/${user.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !user.isActive }),
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

  // ── Render ───────────────────────────────────────────────────────────────────
  const tabs: { key: "empresa" | "equipe"; label: string; icon: React.ReactNode }[] = [
    { key: "empresa", label: "Empresa",  icon: <Building2 className="h-4 w-4" /> },
    ...(canReadTeam ? [{ key: "equipe" as const, label: "Equipe", icon: <Users className="h-4 w-4" /> }] : []),
  ];

  return (
    <div className={mobileLayout.pageStack}>
      <PageHeader
        title="Configurações"
        description="Dados da empresa, equipe e agente de IA do seu workspace."
      />

      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-border/60 px-1">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              mobileLayout.touchTarget,
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── Empresa tab ──────────────────────────────────────────────────────── */}
      {tab === "empresa" && (
        <>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>Informações gerais do seu tenant no CRM PLUS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-1">
              <Label>Nome da empresa</Label>
              {canUpdateSettings ? (
                <div className="flex gap-2">
                  <Input
                    value={nameInput}
                    onChange={(e) => { setNameInput(e.target.value); setNameOk(false); }}
                    className="max-w-sm"
                  />
                  <Button
                    onClick={saveName}
                    disabled={nameSaving || nameInput === tenantName || nameInput.length < 2}
                    size="sm"
                  >
                    {nameSaving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Save className="h-4 w-4" />}
                    <span className="ml-1.5">Salvar</span>
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium">{tenantName}</p>
              )}
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              {nameOk    && <p className="text-xs text-green-600">Salvo com sucesso.</p>}
            </div>

            {/* Readonly fields */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Slug</p>
                <p className="font-mono font-medium">{tenant.slug}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plano</p>
                <p className="font-medium">{PLAN_LABEL[tenant.plan] ?? tenant.plan}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={tenant.status === "active" ? "default" : "destructive"} className="mt-0.5">
                  {STATUS_LABEL[tenant.status] ?? tenant.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="font-medium">{fmtDate(tenant.createdAt)}</p>
              </div>
            </div>

            {/* Setup padrão */}
            {canUpdateSettings && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Configurações padrão</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cria pipeline padrão (5 etapas), tags padrão e automações de IA caso ainda não existam.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runSetup}
                    disabled={setupLoading || setupOk}
                    className="shrink-0"
                  >
                    {setupLoading
                      ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      : setupOk
                        ? <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-600" />
                        : <Wand2 className="mr-1.5 h-4 w-4" />}
                    {setupOk ? "Provisionado!" : "Provisionar"}
                  </Button>
                </div>
                {setupError && <p className="text-xs text-destructive">{setupError}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <AiAgentConfig initial={aiSettings} canEdit={canUpdateSettings} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Integrações Meta
            </CardTitle>
            <CardDescription>
              WhatsApp e Instagram — tokens, webhook e status de conexão.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/integrations"
              className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Configurar integrações
            </Link>
          </CardContent>
        </Card>
        </>
      )}

      {/* ── Equipe tab ───────────────────────────────────────────────────────── */}
      {tab === "equipe" && canReadTeam && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{users.length} membro{users.length !== 1 ? "s" : ""}</p>
            {canCreateTeam && (
              <PrimaryActionButton onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" />
                Novo membro
              </PrimaryActionButton>
            )}
          </div>

          <div className={ds.listStack}>
            {users.length === 0 ? (
              <div className={ds.emptyState}>
                <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
              </div>
            ) : (
              users.map((u) => (
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
                    {(canUpdateTeam || canDeleteTeam) && (
                      <div className="flex shrink-0 items-center gap-1">
                        {canUpdateTeam && (
                          <>
                            <Button variant="ghost" size="icon" className={ds.touchTarget} onClick={() => setEditUser(u)} title="Editar" aria-label="Editar membro">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {u.id !== currentUserId && (
                              <Button variant="ghost" size="icon" className={ds.touchTarget} onClick={() => handleToggleActive(u)} title={u.isActive ? "Desativar" : "Ativar"} aria-label={u.isActive ? "Desativar membro" : "Ativar membro"}>
                                {u.isActive ? <UserX className="h-4 w-4 text-amber-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                              </Button>
                            )}
                          </>
                        )}
                        {canDeleteTeam && u.id !== currentUserId && (
                          <Button variant="ghost" size="icon" className={ds.touchTarget} onClick={() => setDeleteUser(u)} title="Remover" aria-label="Remover membro">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </ListCard>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      {showAdd && (
        <MemberDrawer
          open={showAdd}
          onClose={() => setShowAdd(false)}
          isEdit={false}
          onSave={handleCreate}
        />
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

      <DeleteDialog
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
