import {
  TRIGGER_LABELS,
  ACTION_LABELS,
  type ActionType,
  type AutomationTrigger,
  type TriggerType,
} from "./types";

export type LogStatus = "success" | "failed" | "skipped" | "running";

export type TimelineStepKind = "trigger" | "ai" | "action" | "outcome";

export interface TimelineStep {
  kind: TimelineStepKind;
  title: string;
  detail?: string;
  status?: "success" | "failed" | "neutral";
}

/** Entrada legada: array de ActionType strings. */
export type ActionsRunRaw = string[] | TimelineStep[] | AutomationLogStep[];

export interface AutomationLogStep {
  kind: TimelineStepKind;
  title: string;
  detail?: string;
  status?: "success" | "failed" | "neutral";
  actionType?: ActionType;
}

const INTENT_LABELS: Record<string, string> = {
  interest:           "Interesse de compra",
  quote_request:      "Pedido de orçamento",
  urgency:            "Compra imediata",
  immediate_purchase: "Compra imediata",
  complaint:          "Reclamação",
  losing_interest:    "Perda de interesse",
  doubt:              "Dúvida",
  neutral:            "Neutro",
};

const AI_ACTION_LABELS: Record<string, string> = {
  classify_lead:        "Classificação de lead",
  detect_intent:        "Análise de intenção",
  summarize_conversation: "Resumo da conversa",
  suggest_reply:        "Sugestão de resposta",
  suggest_next_action:  "Próxima ação sugerida",
  detect_stalled_leads: "Leads parados",
  detect_stage_advance: "Avanço de etapa",
};

function parseIntentFromSummary(summary: string | null | undefined): string | null {
  if (!summary) return null;
  const m = summary.match(/intent=([a-z_]+)/i);
  if (m?.[1] && INTENT_LABELS[m[1]]) return INTENT_LABELS[m[1]];
  if (summary.length < 120 && !summary.includes("=")) return summary;
  return null;
}

export function labelAiAction(action: string): string {
  return AI_ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

function buildAiSteps(
  aiLogs: { action: string; outputSummary: string | null }[],
): TimelineStep[] {
  return aiLogs.map((log) => {
    const intent = parseIntentFromSummary(log.outputSummary);
    return {
      kind: "ai" as const,
      title: intent ? "Análise de intenção" : labelAiAction(log.action),
      detail: intent
        ? `IA analisou intenção como: ${intent}`
        : log.outputSummary ?? undefined,
      status: "success" as const,
    };
  });
}

export function buildTimelineSteps(input: {
  trigger?: AutomationTrigger | null;
  status: string;
  error?: string | null;
  actionsRun: ActionsRunRaw;
  aiLogs?: { action: string; outputSummary: string | null }[];
  stageNames?: Record<string, string>;
}): TimelineStep[] {
  const steps: TimelineStep[] = [];

  if (Array.isArray(input.actionsRun) && input.actionsRun.length > 0) {
    const first = input.actionsRun[0];
    if (typeof first === "object" && first !== null && "kind" in first) {
      const structured = input.actionsRun as TimelineStep[];
      const aiSteps = buildAiSteps(input.aiLogs ?? []);
      if (aiSteps.length === 0) return structured;
      const triggerIdx = structured.findIndex((s) => s.kind === "trigger");
      const insertAt = triggerIdx >= 0 ? triggerIdx + 1 : 0;
      return [...structured.slice(0, insertAt), ...aiSteps, ...structured.slice(insertAt)];
    }
  }

  if (input.trigger?.type) {
    steps.push({
      kind: "trigger",
      title: "Gatilho disparado",
      detail: TRIGGER_LABELS[input.trigger.type as TriggerType] ?? input.trigger.type,
      status: "neutral",
    });
  }

  steps.push(...buildAiSteps(input.aiLogs ?? []));

  const actionTypes = Array.isArray(input.actionsRun)
    ? (input.actionsRun as string[]).filter((x) => typeof x === "string")
    : [];

  for (const type of actionTypes) {
    const actionType = type as ActionType;
    let detail = ACTION_LABELS[actionType] ?? type;
    if (actionType === "update_opportunity_stage" && input.stageNames) {
      const stageName = Object.values(input.stageNames)[0];
      if (stageName) detail = `Movido para etapa ${stageName}`;
    }
    if (actionType === "create_task") detail = "Tarefa de follow-up agendada";
    steps.push({
      kind: "action",
      title: "Ação executada",
      detail,
      status: input.status === "failed" ? "failed" : "success",
    });
  }

  if (input.status === "skipped") {
    steps.push({
      kind: "outcome",
      title: "Automação ignorada",
      detail: "Condições do filtro não foram atendidas",
      status: "neutral",
    });
  } else if (input.status === "failed") {
    steps.push({
      kind: "outcome",
      title: "Falhou",
      detail: input.error ?? "Erro ao executar uma ou mais ações",
      status: "failed",
    });
  } else if (input.status === "success") {
    steps.push({
      kind: "outcome",
      title: "Concluído com sucesso",
      status: "success",
    });
  }

  return steps;
}

export function statusBadge(status: string): {
  label: string;
  variant: "success" | "failed" | "skipped" | "running";
} {
  switch (status) {
    case "success":  return { label: "Sucesso", variant: "success" };
    case "failed":   return { label: "Falhou", variant: "failed" };
    case "skipped":  return { label: "Ignorado", variant: "skipped" };
    case "running":  return { label: "Executando", variant: "running" };
    default:        return { label: status, variant: "skipped" };
  }
}
