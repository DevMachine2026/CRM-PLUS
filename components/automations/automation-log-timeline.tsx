"use client";

import { Zap, Bot, Play, Flag, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  buildTimelineSteps,
  statusBadge,
  type ActionsRunRaw,
  type TimelineStep,
} from "@/lib/automations/log-timeline";
import type { AutomationTrigger } from "@/lib/automations/types";

const KIND_ICON = {
  trigger: Zap,
  ai:      Bot,
  action:  Play,
  outcome: Flag,
} as const;

function StepStatusDot({ status }: { status?: TimelineStep["status"] }) {
  if (status === "success") return <span className="h-2 w-2 rounded-full bg-green-500" />;
  if (status === "failed")  return <span className="h-2 w-2 rounded-full bg-red-500" />;
  return <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />;
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusBadge(status);
  const styles = {
    success:  "bg-green-100 text-green-800 border-green-200",
    failed:   "bg-red-100 text-red-800 border-red-200",
    skipped:  "bg-amber-100 text-amber-800 border-amber-200",
    running:  "bg-blue-100 text-blue-800 border-blue-200 animate-pulse",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-medium", styles[meta.variant])}>
      {meta.label}
    </Badge>
  );
}

export type AutomationLogView = {
  id: string;
  status: string;
  error?: string | null;
  actionsRun: ActionsRunRaw;
  createdAt: string;
  automationName: string;
  trigger?: AutomationTrigger | null;
  entityType?: string | null;
  aiLogs?: { action: string; outputSummary: string | null }[];
};

export function AutomationLogTimeline({ log }: { log: AutomationLogView }) {
  const steps = buildTimelineSteps({
    trigger:    log.trigger,
    status:     log.status,
    error:      log.error,
    actionsRun: log.actionsRun,
    aiLogs:     log.aiLogs,
  });

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{log.automationName}</p>
          {log.entityType && (
            <p className="text-[11px] text-muted-foreground capitalize">{log.entityType}</p>
          )}
        </div>
        <StatusBadge status={log.status} />
      </div>

      <ol className="relative space-y-0 border-l-2 border-muted ml-2 pl-4">
        {steps.map((step, i) => {
          const Icon = KIND_ICON[step.kind] ?? Play;
          return (
            <li key={`${step.kind}-${i}`} className="relative pb-4 last:pb-0">
              <span className="absolute -left-[21px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-muted">
                <Icon className="h-2.5 w-2.5 text-muted-foreground" />
              </span>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium">{step.title}</p>
                    <StepStatusDot status={step.status} />
                  </div>
                  {step.detail && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {step.detail}
                    </p>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5" aria-hidden />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {log.error && log.status === "failed" && (
        <p className="text-[11px] text-red-600 bg-red-50 rounded px-2 py-1">{log.error}</p>
      )}
    </div>
  );
}
