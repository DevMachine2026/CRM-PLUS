"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, GitBranch, GripVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { Fab } from "@/components/ui/fab";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ListCard } from "@/components/ui/list-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  name: string;
  order: number;
  probability: number;
}

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  stages: Stage[];
}

interface Props {
  pipelines: Pipeline[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const EMPTY_PIPELINE = { name: "", description: "", isDefault: false };
const EMPTY_STAGE = { name: "", order: "", probability: "0" };

export function PipelineClient({ pipelines, canCreate, canEdit, canDelete }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState("");

  const filteredPipelines = q.trim()
    ? pipelines.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    : pipelines;

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(pipelines.map((p) => [p.id, true]))
  );

  const [pipelineDialog, setPipelineDialog] = useState(false);
  const [editPipeline, setEditPipeline] = useState<Pipeline | null>(null);
  const [pipelineForm, setPipelineForm] = useState(EMPTY_PIPELINE);
  const [pipelineSaving, setPipelineSaving] = useState(false);
  const [pipelineError, setPipelineError] = useState("");

  const [stageDialog, setStageDialog] = useState(false);
  const [stageContext, setStageContext] = useState<{ pipelineId: string; stage: Stage | null } | null>(null);
  const [stageForm, setStageForm] = useState(EMPTY_STAGE);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState("");

  function openCreatePipeline() {
    setEditPipeline(null);
    setPipelineForm(EMPTY_PIPELINE);
    setPipelineError("");
    setPipelineDialog(true);
  }

  function openEditPipeline(p: Pipeline) {
    setEditPipeline(p);
    setPipelineForm({ name: p.name, description: p.description ?? "", isDefault: p.isDefault });
    setPipelineError("");
    setPipelineDialog(true);
  }

  async function handleSavePipeline() {
    if (!pipelineForm.name.trim()) { setPipelineError("Nome é obrigatório."); return; }
    setPipelineSaving(true);
    setPipelineError("");
    try {
      const url = editPipeline ? `/api/pipelines/${editPipeline.id}` : "/api/pipelines";
      const method = editPipeline ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pipelineForm.name,
          description: pipelineForm.description || null,
          isDefault: pipelineForm.isDefault,
        }),
      });
      if (!res.ok) { const d = await res.json(); setPipelineError(d.error ?? "Erro."); return; }
      setPipelineDialog(false);
      startTransition(() => router.refresh());
    } finally {
      setPipelineSaving(false);
    }
  }

  async function handleDeletePipeline(id: string, name: string) {
    if (!confirm(`Excluir o pipeline "${name}"? Todas as etapas serão removidas.`)) return;
    await apiFetch(`/api/pipelines/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  function openCreateStage(pipelineId: string, nextOrder: number) {
    setStageContext({ pipelineId, stage: null });
    setStageForm({ name: "", order: String(nextOrder), probability: "0" });
    setStageError("");
    setStageDialog(true);
  }

  function openEditStage(pipelineId: string, stage: Stage) {
    setStageContext({ pipelineId, stage });
    setStageForm({ name: stage.name, order: String(stage.order), probability: String(stage.probability) });
    setStageError("");
    setStageDialog(true);
  }

  async function handleSaveStage() {
    if (!stageContext) return;
    if (!stageForm.name.trim()) { setStageError("Nome é obrigatório."); return; }
    const order = parseInt(stageForm.order);
    const probability = parseInt(stageForm.probability);
    if (isNaN(order) || order < 1) { setStageError("Ordem inválida."); return; }
    if (isNaN(probability) || probability < 0 || probability > 100) { setStageError("Probabilidade deve ser 0–100."); return; }

    setStageSaving(true);
    setStageError("");
    try {
      const { pipelineId, stage } = stageContext;
      const url = stage
        ? `/api/pipelines/${pipelineId}/stages/${stage.id}`
        : `/api/pipelines/${pipelineId}/stages`;
      const method = stage ? "PATCH" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: stageForm.name, order, probability }),
      });
      if (!res.ok) { const d = await res.json(); setStageError(d.error ?? "Erro."); return; }
      setStageDialog(false);
      startTransition(() => router.refresh());
    } finally {
      setStageSaving(false);
    }
  }

  async function handleDeleteStage(pipelineId: string, stageId: string, name: string) {
    if (!confirm(`Excluir a etapa "${name}"?`)) return;
    await apiFetch(`/api/pipelines/${pipelineId}/stages/${stageId}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <div className={ds.pageStack}>
      <PageHeader
        title="Pipelines"
        description={`${pipelines.length} pipeline${pipelines.length !== 1 ? "s" : ""}`}
        icon={<GitBranch className="h-6 w-6 text-primary" />}
        action={canCreate ? (
          <PrimaryActionButton onClick={openCreatePipeline}>
            <Plus className="h-4 w-4" />
            Novo pipeline
          </PrimaryActionButton>
        ) : undefined}
      />
      {canCreate && <Fab label="Novo pipeline" onClick={openCreatePipeline} />}

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar pipelines…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-11 pl-9"
        />
      </div>

      <div className={ds.listStack}>
        {filteredPipelines.length === 0 ? (
          <div className={ds.emptyState}>
            <p className="text-sm text-muted-foreground">
              {q ? "Nenhum pipeline encontrado." : "Nenhum pipeline cadastrado."}
            </p>
          </div>
        ) : (
          filteredPipelines.map((p) => (
            <ListCard key={p.id} className="p-0 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  className={cn(ds.touchTarget, "text-muted-foreground hover:text-foreground")}
                  onClick={() => setExpanded((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  aria-label={expanded[p.id] ? "Recolher etapas" : "Expandir etapas"}
                >
                  {expanded[p.id]
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />}
                </button>
                <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{p.name}</span>
                    {p.isDefault && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                  </div>
                  {p.description && (
                    <p className="truncate text-sm text-muted-foreground">{p.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {p.stages.length} etapa{p.stages.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <Button variant="ghost" size="icon" className={ds.touchTarget} onClick={() => openEditPipeline(p)} title="Editar" aria-label="Editar pipeline">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(ds.touchTarget, "text-destructive hover:text-destructive")}
                      onClick={() => handleDeletePipeline(p.id, p.name)}
                      title="Excluir"
                      aria-label="Excluir pipeline"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {expanded[p.id] && (
                <div className="border-t">
                  {p.stages.length > 0 && (
                    <div className="flex gap-0 overflow-x-auto border-b bg-muted/30 px-4 py-2">
                      {p.stages.map((s, i) => (
                        <div key={s.id} className="flex shrink-0 items-center gap-0">
                          <div className="flex flex-col items-center px-3 py-1">
                            <span className="whitespace-nowrap text-xs font-medium">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground">{s.probability}%</span>
                          </div>
                          {i < p.stages.length - 1 && (
                            <span className="text-xs text-muted-foreground">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="divide-y">
                    {p.stages.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                        <span className="w-6 text-center text-xs tabular-nums text-muted-foreground">{s.order}</span>
                        <span className="flex-1 text-sm">{s.name}</span>
                        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                          {s.probability}%
                        </span>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="icon" className={ds.touchTarget} onClick={() => openEditStage(p.id, s)} title="Editar etapa" aria-label="Editar etapa">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(ds.touchTarget, "text-destructive hover:text-destructive")}
                              onClick={() => handleDeleteStage(p.id, s.id, s.name)}
                              title="Excluir etapa"
                              aria-label="Excluir etapa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {canEdit && (
                    <div className="border-t px-4 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs text-muted-foreground"
                        onClick={() => openCreateStage(p.id, p.stages.length + 1)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Adicionar etapa
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ListCard>
          ))
        )}
      </div>

      <FormDrawer
        open={pipelineDialog}
        onOpenChange={setPipelineDialog}
        title={editPipeline ? "Editar pipeline" : "Novo pipeline"}
        description="Defina nome, descrição e se é o pipeline padrão do workspace."
        submitLabel={editPipeline ? "Salvar" : "Criar"}
        onSubmit={handleSavePipeline}
        loading={pipelineSaving}
      >
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input
            value={pipelineForm.name}
            onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
            placeholder="Vendas, Pós-venda, Parcerias..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea
            value={pipelineForm.description}
            onChange={(e) => setPipelineForm({ ...pipelineForm, description: e.target.value })}
            placeholder="Descrição do pipeline..."
            className="resize-none"
            rows={2}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pipelineForm.isDefault}
            onChange={(e) => setPipelineForm({ ...pipelineForm, isDefault: e.target.checked })}
            className="rounded"
          />
          Pipeline padrão
        </label>
        {pipelineError && <p className="text-sm text-destructive">{pipelineError}</p>}
      </FormDrawer>

      <FormDrawer
        open={stageDialog}
        onOpenChange={setStageDialog}
        title={stageContext?.stage ? "Editar etapa" : "Nova etapa"}
        description="Ordem e probabilidade definem o funil de oportunidades."
        submitLabel={stageContext?.stage ? "Salvar" : "Criar"}
        onSubmit={handleSaveStage}
        loading={stageSaving}
      >
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input
            value={stageForm.name}
            onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
            placeholder="Prospecção, Proposta, Fechamento..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Ordem *</Label>
            <Input
              type="number"
              min={1}
              value={stageForm.order}
              onChange={(e) => setStageForm({ ...stageForm, order: e.target.value })}
              placeholder="1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Probabilidade (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={stageForm.probability}
              onChange={(e) => setStageForm({ ...stageForm, probability: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
        {stageError && <p className="text-sm text-destructive">{stageError}</p>}
      </FormDrawer>
    </div>
  );
}
