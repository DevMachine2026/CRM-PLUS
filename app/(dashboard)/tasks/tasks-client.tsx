"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2, XCircle, Clock, Bot, User,
  Pencil, Trash2, Loader2, CheckSquare, AlertTriangle,
  ChevronRight, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/layout/filter-bar";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { Fab } from "@/components/ui/fab";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "done" | "cancelled";
  priority: "low" | "medium" | "high";
  source: string | null;
  dueAt: string | null;
  createdAt: string;
  contact:     { id: string; name: string } | null;
  opportunity: { id: string; title: string } | null;
  assignedUser:{ id: string; name: string } | null;
};

type Props = {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  statusCounts: Record<string, number>;
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  high: "Alta", medium: "Média", low: "Baixa",
};
const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high:   "text-red-600 bg-red-50 border-red-200",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  low:    "text-slate-600 bg-slate-50 border-slate-200",
};
const STATUS_ICON: Record<Task["status"], React.ReactNode> = {
  pending:   <Clock className="w-3.5 h-3.5" />,
  done:      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-slate-400" />,
};
const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "Pendente", done: "Concluída", cancelled: "Cancelada",
};

function isOverdue(dueAt: string | null, status: Task["status"]) {
  if (!dueAt || status !== "pending") return false;
  return new Date(dueAt) < new Date();
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

export function TasksClient({
  tasks, total, page, limit, statusCounts,
  canUpdate, canDelete, canCreate,
}: Props) {
  const router = useRouter();
  const sp     = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Edit dialog state
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle]     = useState("");
  const [editDesc,  setEditDesc]      = useState("");
  const [editPriority, setEditPriority] = useState<Task["priority"]>("medium");
  const [editDueAt, setEditDueAt]     = useState("");
  const [isSaving, setIsSaving]       = useState(false);
  const [dialogError, setDialogError] = useState("");

  // Create dialog state
  const [showCreate, setShowCreate]     = useState(false);
  const [newTitle,   setNewTitle]       = useState("");
  const [newDesc,    setNewDesc]        = useState("");
  const [newPriority,setNewPriority]    = useState<Task["priority"]>("medium");
  const [newDueAt,   setNewDueAt]       = useState("");
  const [isCreating, setIsCreating]     = useState(false);
  const [createError,setCreateError]    = useState("");

  const pages = Math.ceil(total / limit);

  function pushParam(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.delete("page");
    startTransition(() => router.push(`?${p.toString()}`));
  }

  async function patchTask(id: string, body: object) {
    const res = await apiFetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  }

  async function markDone(id: string) {
    await patchTask(id, { status: "done" });
    startTransition(() => router.refresh());
  }

  async function markCancelled(id: string) {
    await patchTask(id, { status: "cancelled" });
    startTransition(() => router.refresh());
  }

  async function deleteTask(id: string) {
    await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  function openEdit(task: Task) {
    setEditTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description ?? "");
    setEditPriority(task.priority);
    setEditDueAt(task.dueAt ? task.dueAt.slice(0, 16) : "");
    setDialogError("");
  }

  async function handleSave() {
    if (!editTask) return;
    setIsSaving(true); setDialogError("");
    const res = await patchTask(editTask.id, {
      title: editTitle,
      description: editDesc || null,
      priority: editPriority,
      dueAt: editDueAt ? new Date(editDueAt).toISOString() : null,
    });
    const json = await res.json();
    setIsSaving(false);
    if (!res.ok) { setDialogError(json.error ?? "Erro ao salvar."); return; }
    setEditTask(null);
    startTransition(() => router.refresh());
  }

  async function handleCreate() {
    if (!newTitle.trim()) { setCreateError("Título obrigatório."); return; }
    setIsCreating(true); setCreateError("");
    const res = await apiFetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        description: newDesc || null,
        priority: newPriority,
        dueAt: newDueAt ? new Date(newDueAt).toISOString() : null,
        source: "manual",
      }),
    });
    const json = await res.json();
    setIsCreating(false);
    if (!res.ok) { setCreateError(json.error ?? "Erro ao criar."); return; }
    setShowCreate(false);
    setNewTitle(""); setNewDesc(""); setNewDueAt(""); setNewPriority("medium");
    startTransition(() => router.refresh());
  }

  const pending   = statusCounts["pending"]   ?? 0;
  const done      = statusCounts["done"]       ?? 0;
  const cancelled = statusCounts["cancelled"]  ?? 0;
  const totalAll  = pending + done + cancelled;
  const statusFilter = sp.get("status") ?? "";

  function renderActions(task: Task) {
    return (
      <div className="flex items-center gap-1">
        {canUpdate && task.status === "pending" && (
          <>
            <Button size="icon" variant="ghost" className="min-h-11 min-w-11 text-green-600 hover:bg-green-50 hover:text-green-700" title="Concluir" onClick={() => markDone(task.id)}>
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="min-h-11 min-w-11" title="Editar" onClick={() => openEdit(task)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive" title="Cancelar" onClick={() => markCancelled(task.id)}>
              <XCircle className="h-4 w-4" />
            </Button>
          </>
        )}
        {canDelete && task.status !== "pending" && (
          <Button size="icon" variant="ghost" className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive" title="Deletar" onClick={() => deleteTask(task.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  const statusFilters = [
    { key: "", label: "Todas", value: totalAll, valueClassName: undefined as string | undefined },
    { key: "pending", label: "Pendentes", value: pending, valueClassName: "text-yellow-700" },
    { key: "done", label: "Concluídas", value: done, valueClassName: "text-green-700" },
    { key: "cancelled", label: "Canceladas", value: cancelled, valueClassName: "text-slate-500" },
  ] as const;

  function TaskRow({ task }: { task: Task }) {
    const overdue = isOverdue(task.dueAt, task.status);
    return (
      <ListCard>
        <div className="flex items-start gap-4">
          <div className="mt-1 shrink-0">{STATUS_ICON[task.status]}</div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className={cn("text-base font-semibold leading-snug", task.status === "done" && "text-muted-foreground line-through")}>
              {task.title}
            </p>
            {task.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", PRIORITY_COLOR[task.priority])}>
                {PRIORITY_LABEL[task.priority]}
              </span>
              <span className="text-xs text-muted-foreground">{STATUS_LABEL[task.status]}</span>
              {task.source === "ai" ? (
                <Badge variant="secondary" className="gap-1 border-purple-200 bg-purple-50 text-xs text-purple-700">
                  <Bot className="h-3 w-3" /> IA
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <User className="h-3 w-3" /> Manual
                </Badge>
              )}
            </div>
            <p className={cn("text-xs font-medium", overdue ? "text-red-600" : "text-muted-foreground")}>
              {overdue && <AlertTriangle className="mr-1 inline h-3 w-3" />}
              Prazo: {fmtDate(task.dueAt)}
            </p>
            {(task.opportunity || task.contact) && (
              <p className="truncate text-xs text-muted-foreground">
                {task.opportunity?.title ?? task.contact?.name}
              </p>
            )}
          </div>
          {(canUpdate || canDelete) && <div className="shrink-0">{renderActions(task)}</div>}
        </div>
      </ListCard>
    );
  }

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Central de Tarefas"
        description={`${total} tarefa${total !== 1 ? "s" : ""}`}
        icon={<CheckSquare className="h-6 w-6" />}
        action={canCreate ? (
          <PrimaryActionButton onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Nova tarefa
          </PrimaryActionButton>
        ) : undefined}
      />
      {canCreate && <Fab label="Nova tarefa" onClick={() => setShowCreate(true)} />}

      <MetricGrid>
        {statusFilters.map((f) => (
          <button key={f.key || "all"} type="button" onClick={() => pushParam("status", f.key)}
            className={cn("rounded-xl text-left transition-all duration-200", statusFilter === f.key && "ring-2 ring-primary ring-offset-2")}>
            <MetricCard label={f.label} value={f.value} valueClassName={f.valueClassName} />
          </button>
        ))}
      </MetricGrid>

      <FilterBar>
        <Select value={sp.get("priority") ?? "all"} onValueChange={(v) => pushParam("priority", !v || v === "all" ? "" : v)}>
          <SelectTrigger className="min-h-11 w-full sm:w-36"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sp.get("source") ?? "all"} onValueChange={(v) => pushParam("source", !v || v === "all" ? "" : v)}>
          <SelectTrigger className="min-h-11 w-full sm:w-36"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="ai">IA</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </FilterBar>

      <div className={ds.listStack}>
        {tasks.length === 0 ? (
          <div className={ds.emptyState}>
            <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
            {canCreate && (
              <PrimaryActionButton className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> Nova tarefa
              </PrimaryActionButton>
            )}
          </div>
        ) : (
          tasks.map((task) => <TaskRow key={task.id} task={task} />)
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
        open={!!editTask}
        onOpenChange={(o) => { if (!o) setEditTask(null); }}
        title="Editar tarefa"
        submitLabel="Salvar"
        onSubmit={handleSave}
        loading={isSaving}
      >
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <Select value={editPriority} onValueChange={(v) => setEditPriority((v ?? "medium") as Task["priority"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Prazo</Label>
          <Input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} />
        </div>
        {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
      </FormDrawer>

      <FormDrawer
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Nova tarefa"
        description="Registre rapidamente o que precisa ser feito."
        submitLabel="Criar"
        onSubmit={handleCreate}
        loading={isCreating}
      >
        <div className="space-y-1.5">
          <Label>Título *</Label>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Descreva a tarefa..." />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <Select value={newPriority} onValueChange={(v) => setNewPriority((v ?? "medium") as Task["priority"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Prazo</Label>
          <Input type="datetime-local" value={newDueAt} onChange={(e) => setNewDueAt(e.target.value)} />
        </div>
        {createError && <p className="text-sm text-destructive">{createError}</p>}
      </FormDrawer>
    </div>
  );
}
