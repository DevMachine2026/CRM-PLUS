"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition } from "react";
import {
  Zap, Plus, Pencil, Trash2, Loader2, CheckCircle2,
  XCircle, Activity, ChevronRight, X, Bot,
} from "lucide-react";
import {
  AutomationLogTimeline,
  type AutomationLogView,
} from "@/components/automations/automation-log-timeline";
import {
  AiActivityPanel,
  type AiLogView,
} from "@/components/automations/ai-activity-panel";
import type { AutomationTrigger } from "@/lib/automations/types";
import type { ActionsRunRaw } from "@/lib/automations/log-timeline";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { Fab } from "@/components/ui/fab";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { ds } from "@/lib/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import type {
  TriggerType, ActionType, ActionConfig, Condition, ConditionOperator,
} from "@/lib/automations/types";
import {
  TRIGGER_LABELS, ACTION_LABELS, CONDITION_OPERATOR_LABELS,
} from "@/lib/automations/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Automation = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  trigger: unknown;
  conditions: unknown;
  actions: unknown;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
};

type AutomationLog = AutomationLogView;

type Stage = { id: string; name: string; pipelineName: string };

type Props = {
  automations: Automation[];
  logs: AutomationLog[];
  aiLogs: AiLogView[];
  stages: Stage[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIGGER_TYPES: TriggerType[] = [
  "contact_created", "contact_status_changed", "opportunity_created",
  "opportunity_status_changed", "opportunity_stage_changed",
  "task_created", "revenue_status_changed", "conversation_created",
];

const ACTION_TYPES: ActionType[] = [
  "create_task", "add_tag", "update_contact_status",
  "create_activity", "send_whatsapp", "send_instagram",
  "update_opportunity_stage",
];

const CONDITION_OPERATORS: ConditionOperator[] = [
  "eq", "neq", "gt", "lt", "gte", "lte",
  "contains", "not_contains", "is_empty", "is_not_empty",
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

// ─── Empty action by type ─────────────────────────────────────────────────────

function emptyAction(type: ActionType): ActionConfig {
  switch (type) {
    case "send_whatsapp":   return { type, message: "" };
    case "send_instagram":  return { type, message: "" };
    case "create_task":     return { type, title: "", priority: "medium", dueDays: 1 };
    case "update_contact_status": return { type, status: "customer" };
    case "add_tag":         return { type, tagName: "" };
    case "create_activity": return { type, activityType: "note", title: "" };
    case "update_opportunity_stage": return { type, stageId: "" };
  }
}

// ─── Action editor ────────────────────────────────────────────────────────────

function ActionEditor({
  action, onChange, stages,
}: { action: ActionConfig; onChange: (a: ActionConfig) => void; stages: Stage[] }) {
  switch (action.type) {
    case "send_whatsapp":
    case "send_instagram":
      return (
        <div className="space-y-1">
          <Label className="text-xs">Mensagem</Label>
          <Textarea
            value={action.message}
            onChange={(e) => onChange({ ...action, message: e.target.value })}
            placeholder="Olá! Somos o time comercial..."
            rows={3}
            className="text-xs"
          />
        </div>
      );

    case "create_task":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Título da tarefa</Label>
            <Input
              value={action.title}
              onChange={(e) => onChange({ ...action, title: e.target.value })}
              placeholder="Fazer follow-up com o contato"
              className="text-xs h-8"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select
                value={action.priority ?? "medium"}
                onValueChange={(v) => onChange({ ...action, priority: v as "low" | "medium" | "high" })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prazo (dias)</Label>
              <Input
                type="number" min={0} max={365}
                value={action.dueDays ?? ""}
                onChange={(e) => onChange({ ...action, dueDays: Number(e.target.value) || undefined })}
                placeholder="3"
                className="text-xs h-8"
              />
            </div>
          </div>
        </div>
      );

    case "update_contact_status":
      return (
        <div>
          <Label className="text-xs">Novo status</Label>
          <Select
            value={action.status}
            onValueChange={(v) => onChange({ ...action, status: v as "lead" | "customer" | "inactive" })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="customer">Cliente</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case "add_tag":
      return (
        <div>
          <Label className="text-xs">Nome da tag</Label>
          <Input
            value={action.tagName}
            onChange={(e) => onChange({ ...action, tagName: e.target.value })}
            placeholder="novo-lead"
            className="text-xs h-8"
          />
        </div>
      );

    case "create_activity":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Tipo de atividade</Label>
            <Select
              value={action.activityType}
              onValueChange={(v) => onChange({ ...action, activityType: v as typeof action.activityType })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["call","meeting","email","note","whatsapp","instagram"] as const).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input
              value={action.title}
              onChange={(e) => onChange({ ...action, title: e.target.value })}
              placeholder="Ligação de follow-up"
              className="text-xs h-8"
            />
          </div>
        </div>
      );

    case "update_opportunity_stage":
      return (
        <div>
          <Label className="text-xs">Etapa de destino</Label>
          <Select
            value={action.stageId ?? ""}
            onValueChange={(v) => onChange({ type: "update_opportunity_stage", stageId: v ?? "" })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar etapa" /></SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.pipelineName} → {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AutomationsClient({
  automations, logs, aiLogs, stages, canCreate, canEdit, canDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [logTab, setLogTab] = useState<"automations" | "ai">("automations");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("contact_created");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<ActionConfig[]>([emptyAction("create_task")]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setTriggerType("contact_created");
    setConditions([]);
    setActions([emptyAction("create_task")]);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(a: Automation) {
    setEditingId(a.id);
    setName(a.name);
    setDescription(a.description ?? "");
    setTriggerType((a.trigger as AutomationTrigger).type);
    setConditions((a.conditions as Condition[]) ?? []);
    setActions((a.actions as ActionConfig[]) ?? [emptyAction("create_task")]);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) { setFormError("Nome é obrigatório."); return; }
    if (actions.length === 0) { setFormError("Adicione pelo menos uma ação."); return; }

    setSaving(true);
    setFormError(null);

    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      trigger: { type: triggerType },
      conditions,
      actions,
    };

    try {
      const url = editingId ? `/api/automations/${editingId}` : "/api/automations";
      const method = editingId ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFormError(json.error ?? "Erro ao salvar automação.");
        return;
      }

      setDialogOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setFormError("Erro de rede. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    await apiFetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    await apiFetch(`/api/automations/${id}`, { method: "DELETE" });
    setDeletingId(null);
    startTransition(() => router.refresh());
  }

  function addCondition() {
    setConditions((prev) => [...prev, { field: "contact.status", operator: "eq", value: "" }]);
  }

  function updateCondition(i: number, patch: Partial<Condition>) {
    setConditions((prev) => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function removeCondition(i: number) {
    setConditions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addAction() {
    setActions((prev) => [...prev, emptyAction("create_task")]);
  }

  function updateAction(i: number, updated: ActionConfig) {
    setActions((prev) => prev.map((a, idx) => idx === i ? updated : a));
  }

  function changeActionType(i: number, type: ActionType) {
    setActions((prev) => prev.map((a, idx) => idx === i ? emptyAction(type) : a));
  }

  function removeAction(i: number) {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  }

  const activeCount = automations.filter((a) => a.isActive).length;
  const totalRuns = automations.reduce((s, a) => s + a.runCount, 0);

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Automações"
        description="Crie regras que executam ações automaticamente quando eventos acontecem no CRM."
        action={
          canCreate ? (
            <PrimaryActionButton onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova automação
            </PrimaryActionButton>
          ) : undefined
        }
      />
      {canCreate && <Fab label="Nova automação" onClick={openCreate} />}

      <MetricGrid>
        <MetricCard label="Total de automações" value={automations.length} />
        <MetricCard label="Ativas" value={activeCount} />
        <MetricCard label="Total de execuções" value={totalRuns} />
        <MetricCard label="Logs recentes" value={logs.length} />
      </MetricGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Automation list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Regras configuradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {automations.length === 0 ? (
              <div className="py-8 text-center">
                <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma automação criada ainda.</p>
                {canCreate && (
                  <Button onClick={openCreate} variant="outline" size="sm" className="mt-3 gap-2">
                    <Plus className="h-3.5 w-3.5" />
                    Criar primeira automação
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {automations.map((a) => {
                  const trigger = a.trigger as AutomationTrigger;
                  const acts = a.actions as ActionConfig[];
                  return (
                    <ListCard key={a.id} className="!p-4">
                      <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Zap className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <Badge
                            variant={a.isActive ? "default" : "secondary"}
                            className="shrink-0 text-[10px] h-4 px-1.5"
                          >
                            {a.isActive ? "ativa" : "pausada"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {TRIGGER_LABELS[trigger.type]}
                          {acts.length > 0 && (
                            <>
                              <ChevronRight className="inline h-3 w-3 mx-0.5" />
                              {acts.map((ac) => ACTION_LABELS[ac.type]).join(", ")}
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span>{a.runCount} execuç{a.runCount === 1 ? "ão" : "ões"}</span>
                          {a.lastRunAt && <span>última: {timeAgo(a.lastRunAt)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7"
                              title={a.isActive ? "Pausar" : "Ativar"}
                              onClick={() => handleToggle(a.id, a.isActive)}
                              disabled={isPending}
                            >
                              {a.isActive
                                ? <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                : <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                              }
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(a)}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      </div>
                    </ListCard>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Painel de execução
            </CardTitle>
            <div className="flex gap-1 mt-3 border-b -mb-px">
              <button
                type="button"
                onClick={() => setLogTab("automations")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  logTab === "automations"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Automações ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogTab("ai")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  logTab === "ai"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                IA ({aiLogs.length})
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {logTab === "automations" ? (
            logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhuma execução registrada ainda.
              </p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div key={log.id}>
                    <AutomationLogTimeline
                      log={{
                        ...log,
                        actionsRun: log.actionsRun as ActionsRunRaw,
                        trigger: log.trigger as AutomationTrigger | null | undefined,
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground text-right mt-1 px-1">
                      {timeAgo(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )
            ) : (
              <AiActivityPanel logs={aiLogs} />
            )}
          </CardContent>
        </Card>
      </div>

      <FormDrawer
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? "Editar automação" : "Nova automação"}
        description="Configure gatilho, condições e ações em um só fluxo."
        submitLabel={editingId ? "Salvar alterações" : "Criar automação"}
        onSubmit={handleSave}
        loading={saving}
        className="max-w-2xl"
      >
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="aut-name">Nome <span className="text-red-500">*</span></Label>
              <Input
                id="aut-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Follow-up automático de leads"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="aut-desc">Descrição</Label>
              <Input
                id="aut-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional — explique o objetivo desta automação"
              />
            </div>

            {/* Trigger */}
            <div className="space-y-1.5">
              <Label>Gatilho <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground">Quando esta automação deve ser acionada?</p>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TRIGGER_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Condições</Label>
                  <p className="text-xs text-muted-foreground">Filtre quando a automação deve rodar (opcional).</p>
                </div>
                <Button variant="outline" size="sm" onClick={addCondition} className="gap-1 text-xs h-7">
                  <Plus className="h-3 w-3" /> Condição
                </Button>
              </div>
              {conditions.map((cond, i) => (
                <div key={i} className="flex gap-2 items-center rounded-md border p-2 bg-muted/30">
                  <Input
                    value={cond.field}
                    onChange={(e) => updateCondition(i, { field: e.target.value })}
                    placeholder="contact.status"
                    className="text-xs h-7 w-36"
                  />
                  <Select
                    value={cond.operator}
                    onValueChange={(v) => updateCondition(i, { operator: v as ConditionOperator })}
                  >
                    <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPERATORS.map((op) => (
                        <SelectItem key={op} value={op}>{CONDITION_OPERATOR_LABELS[op]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!["is_empty","is_not_empty"].includes(cond.operator) && (
                    <Input
                      value={String(cond.value ?? "")}
                      onChange={(e) => updateCondition(i, { value: e.target.value })}
                      placeholder="valor"
                      className="text-xs h-7 flex-1"
                    />
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeCondition(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ações <span className="text-red-500">*</span></Label>
                  <p className="text-xs text-muted-foreground">O que deve acontecer quando o gatilho for acionado?</p>
                </div>
                <Button variant="outline" size="sm" onClick={addAction} className="gap-1 text-xs h-7">
                  <Plus className="h-3 w-3" /> Ação
                </Button>
              </div>
              {actions.map((action, i) => (
                <div key={i} className="rounded-md border p-3 space-y-3 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Select
                      value={action.type}
                      onValueChange={(v) => changeActionType(i, v as ActionType)}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{ACTION_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeAction(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ActionEditor
                    action={action}
                    onChange={(updated) => updateAction(i, updated)}
                    stages={stages}
                  />
                </div>
              ))}
              {actions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Adicione pelo menos uma ação.</p>
              )}
            </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </FormDrawer>

      {/* ─── Delete confirmation dialog ───────────────────────────────────── */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir automação?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. O histórico de execuções também será removido.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
