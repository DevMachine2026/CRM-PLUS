"use client";

import { useCallback, useEffect, useOptimistic, useState, useTransition } from "react";
import {
  TrendingUp, Trophy, XCircle, GripVertical, Plus,
  Smartphone, Camera, AtSign, MessageSquare, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KanbanOpportunity, KanbanStage, OptimisticMove } from "@/lib/kanban/types";
import { formatInactivityLabel, inactivitySeverity } from "@/lib/kanban/inactivity";
import { KanbanToastHost, showKanbanToast } from "@/components/kanban/kanban-toast";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface KanbanBoardProps {
  opportunities: KanbanOpportunity[];
  stages: KanbanStage[];
  isLoading?: boolean;
  canEdit: boolean;
  canCreate: boolean;
  onMoveStage: (oppId: string, newStageId: string) => Promise<boolean>;
  onQuickWon: (oppId: string) => Promise<void>;
  onQuickLost: (oppId: string) => Promise<void>;
  onOpenCreate: (stageId: string) => void;
  onOpenEdit: (oppId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(v: unknown) {
  const n = Number(v);
  if (isNaN(n) || v === null || n === 0) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtDate(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp:  <Smartphone className="h-3.5 w-3.5 text-green-600" aria-hidden />,
  instagram: <Camera className="h-3.5 w-3.5 text-pink-600" aria-hidden />,
  email:     <AtSign className="h-3.5 w-3.5 text-blue-600" aria-hidden />,
  manual:    <MessageSquare className="h-3.5 w-3.5 text-slate-500" aria-hidden />,
};

function priorityTags(opp: KanbanOpportunity) {
  const merged = [...(opp.contact?.tags ?? []), ...opp.tags];
  const seen = new Set<string>();
  return merged.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  }).slice(0, 3);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function KanbanCardSkeleton() {
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm space-y-2">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-1">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function KanbanBoardSkeleton({ stageCount = 5 }: { stageCount?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" aria-busy="true" aria-label="Carregando pipeline">
      {Array.from({ length: stageCount }).map((_, i) => (
        <div key={i} className="flex w-64 shrink-0 flex-col">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <div className="min-h-[120px] space-y-2 rounded-lg bg-muted/30 p-2">
            <KanbanCardSkeleton />
            <KanbanCardSkeleton />
            {i % 2 === 0 && <KanbanCardSkeleton />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function KanbanCard({
  opp, canEdit, isDragging, isPendingMove,
  onDragStart, onDragEnd, onWon, onLost, onEdit,
}: {
  opp: KanbanOpportunity;
  canEdit: boolean;
  isDragging: boolean;
  isPendingMove: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onWon: () => void;
  onLost: () => void;
  onEdit: () => void;
}) {
  const isOverdue = opp.expectedCloseAt && new Date(opp.expectedCloseAt) < new Date();
  const value = fmtCurrency(opp.value);
  const closeDate = fmtDate(opp.expectedCloseAt);
  const tags = priorityTags(opp);
  const inactivity = formatInactivityLabel(opp);
  const inactLevel = inactivitySeverity(opp);
  const channel = opp.contact?.sourceChannel;

  return (
    <article
      draggable={canEdit && !isPendingMove}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-grabbed={isDragging}
      className={cn(
        "group rounded-lg border bg-background p-3 shadow-sm select-none transition-all duration-200",
        canEdit && !isPendingMove && "cursor-grab active:cursor-grabbing hover:shadow-md",
        isDragging && "scale-95 opacity-40",
        isPendingMove && "opacity-70 ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-start gap-1.5">
        {canEdit && (
          <GripVertical
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p
              className="cursor-pointer text-sm font-medium leading-snug hover:text-primary"
              onClick={onEdit}
              onKeyDown={(e) => e.key === "Enter" && onEdit()}
              role="button"
              tabIndex={0}
            >
              {opp.title}
            </p>
            {channel && CHANNEL_ICON[channel] && (
              <span title={`Canal: ${channel}`} className="shrink-0">
                {CHANNEL_ICON[channel]}
              </span>
            )}
          </div>

          {(opp.contact || opp.company) && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {opp.contact?.name ?? opp.company?.name}
            </p>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="h-5 px-1.5 text-[10px] font-normal"
              style={tag.color ? { backgroundColor: `${tag.color}22`, color: tag.color, borderColor: `${tag.color}44` } : undefined}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {inactivity && (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-[10px] font-medium",
            inactLevel === "critical" && "text-red-600",
            inactLevel === "warn" && "text-amber-700",
            inactLevel === "none" && "text-muted-foreground",
          )}
        >
          <Clock className="h-3 w-3 shrink-0" aria-hidden />
          {inactivity}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {value && (
          <span className="text-xs font-semibold tabular-nums text-foreground">{value}</span>
        )}
        {closeDate && (
          <span className={cn("ml-auto text-[10px]", isOverdue ? "font-semibold text-red-600" : "text-muted-foreground")}>
            {closeDate}
          </span>
        )}
      </div>

      {isPendingMove && (
        <p className="mt-1 text-[10px] text-muted-foreground animate-pulse">Salvando posição…</p>
      )}

      {canEdit && (
        <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[10px] text-green-700 hover:bg-green-50"
            onClick={(e) => { e.stopPropagation(); onWon(); }}
            title="Marcar como ganha"
          >
            <Trophy className="mr-0.5 h-3 w-3" />Ganhou
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[10px] text-red-600 hover:bg-red-50"
            onClick={(e) => { e.stopPropagation(); onLost(); }}
            title="Marcar como perdida"
          >
            <XCircle className="mr-0.5 h-3 w-3" />Perdeu
          </Button>
        </div>
      )}
    </article>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({
  stage, cards, canEdit, canCreate, draggingId, pendingMoveId,
  onDragStart, onDragEnd, onDrop,
  onWon, onLost, onEdit, onCreateHere,
}: {
  stage: KanbanStage;
  cards: KanbanOpportunity[];
  canEdit: boolean;
  canCreate: boolean;
  draggingId: string | null;
  pendingMoveId: string | null;
  onDragStart: (oppId: string) => void;
  onDragEnd: () => void;
  onDrop: (stageId: string) => void;
  onWon: (oppId: string) => void;
  onLost: (oppId: string) => void;
  onEdit: (oppId: string) => void;
  onCreateHere: (stageId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const totalValue = cards.reduce((s, o) => s + Number(o.value ?? 0), 0);
  const colId = `kanban-col-${stage.id}`;

  return (
    <section className="flex w-64 shrink-0 flex-col" aria-labelledby={colId}>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 id={colId} className="truncate text-sm font-semibold">{stage.name}</h3>
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {cards.length}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {totalValue > 0 && (
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            </span>
          )}
          {canCreate && (
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onCreateHere(stage.id)} aria-label={`Nova oportunidade em ${stage.name}`}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div
        role="list"
        aria-label={`Oportunidades em ${stage.name}`}
        className={cn(
          "min-h-[120px] flex-1 space-y-2 rounded-lg p-2 transition-colors",
          dragOver ? "border-2 border-dashed border-primary/40 bg-primary/10" : "bg-muted/30",
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(stage.id); }}
      >
        {cards.map((opp) => (
          <div key={opp.id} role="listitem">
            <KanbanCard
              opp={opp}
              canEdit={canEdit}
              isDragging={draggingId === opp.id}
              isPendingMove={pendingMoveId === opp.id}
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(opp.id); }}
              onDragEnd={onDragEnd}
              onWon={() => onWon(opp.id)}
              onLost={() => onLost(opp.id)}
              onEdit={() => onEdit(opp.id)}
            />
          </div>
        ))}
        {cards.length === 0 && !draggingId && (
          <p className="py-4 text-center text-xs text-muted-foreground/60">Sem oportunidades</p>
        )}
      </div>
    </section>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────

export function KanbanBoard({
  opportunities: initialOpportunities,
  stages,
  isLoading = false,
  canEdit,
  canCreate,
  onMoveStage,
  onQuickWon,
  onQuickLost,
  onOpenCreate,
  onOpenEdit,
}: KanbanBoardProps) {
  const [, startTransition] = useTransition();
  const [boardOpps, setBoardOpps] = useState(initialOpportunities);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);

  useEffect(() => {
    setBoardOpps(initialOpportunities);
  }, [initialOpportunities]);

  const [displayOpps, applyOptimisticMove] = useOptimistic(
    boardOpps,
    (state, move: OptimisticMove) =>
      state.map((o) => (o.id === move.oppId ? { ...o, stage: move.stage } : o)),
  );

  const executeMove = useCallback(
    async (oppId: string, targetStageId: string) => {
      const opp = boardOpps.find((o) => o.id === oppId);
      const targetStage = stages.find((s) => s.id === targetStageId);
      if (!opp || !targetStage || opp.stage.id === targetStageId) return;

      const previousStage = opp.stage;
      setPendingMoveId(oppId);

      startTransition(async () => {
        applyOptimisticMove({ oppId, stage: targetStage });
        const ok = await onMoveStage(oppId, targetStageId);
        setPendingMoveId(null);

        if (!ok) {
          setBoardOpps((prev) =>
            prev.map((o) => (o.id === oppId ? { ...o, stage: previousStage } : o)),
          );
          showKanbanToast({
            message: "Falha ao mover oportunidade. Tentando novamente...",
            retry: () => { void executeMove(oppId, targetStageId); },
          });
          return;
        }

        setBoardOpps((prev) =>
          prev.map((o) => (o.id === oppId ? { ...o, stage: targetStage } : o)),
        );
      });
    },
    [boardOpps, stages, onMoveStage, applyOptimisticMove],
  );

  function handleDrop(targetStageId: string) {
    if (!draggingId) return;
    const opp = displayOpps.find((o) => o.id === draggingId);
    setDraggingId(null);
    if (!opp || opp.stage.id === targetStageId) return;
    void executeMove(draggingId, targetStageId);
  }

  const openOpps = displayOpps.filter((o) => o.status === "open");
  const byStage = Object.fromEntries(stages.map((s) => [s.id, [] as KanbanOpportunity[]]));
  openOpps.forEach((o) => {
    if (byStage[o.stage.id]) byStage[o.stage.id].push(o);
    else if (stages[0]) byStage[stages[0].id].push(o);
  });

  const totalOpen = openOpps.length;
  const totalValue = openOpps.reduce((s, o) => s + Number(o.value ?? 0), 0);
  const wonCount = displayOpps.filter((o) => o.status === "won").length;
  const lostCount = displayOpps.filter((o) => o.status === "lost").length;

  if (isLoading) {
    return <KanbanBoardSkeleton stageCount={stages.length || 5} />;
  }

  return (
    <>
      <KanbanToastHost />
      <div className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            {totalOpen} aberta{totalOpen !== 1 ? "s" : ""}
            {totalValue > 0 && ` · ${totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`}
          </span>
          {wonCount > 0 && (
            <span className="flex items-center gap-1 text-green-700">
              <Trophy className="h-3.5 w-3.5" aria-hidden />{wonCount} ganha{wonCount !== 1 ? "s" : ""}
            </span>
          )}
          {lostCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3.5 w-3.5" aria-hidden />{lostCount} perdida{lostCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              cards={byStage[stage.id] ?? []}
              canEdit={canEdit}
              canCreate={canCreate}
              draggingId={draggingId}
              pendingMoveId={pendingMoveId}
              onDragStart={setDraggingId}
              onDragEnd={() => setDraggingId(null)}
              onDrop={handleDrop}
              onWon={onQuickWon}
              onLost={onQuickLost}
              onEdit={onOpenEdit}
              onCreateHere={onOpenCreate}
            />
          ))}
          {stages.length === 0 && (
            <p className="w-full py-8 text-center text-sm text-muted-foreground">
              Nenhuma etapa configurada.{" "}
              <a href="/pipeline" className="text-primary underline">Configurar pipeline</a>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
