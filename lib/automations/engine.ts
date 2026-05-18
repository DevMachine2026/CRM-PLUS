import { prisma } from "@/lib/db/client";
import { executeAction, type ActionResult } from "./action-handlers";
import type {
  TriggerPayload,
  Condition,
  ConditionOperator,
  AutomationTrigger,
  ActionConfig,
  TriggerType,
} from "./types";
import { TRIGGER_LABELS } from "./types";
import type { AutomationLogStep } from "./log-timeline";

// ─── Condition evaluation ─────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current != null && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function evaluateCondition(condition: Condition, data: Record<string, unknown>): boolean {
  const actual = getNestedValue(data, condition.field);
  const expected = condition.value;
  const op: ConditionOperator = condition.operator;

  if (op === "is_empty") return actual == null || actual === "";
  if (op === "is_not_empty") return actual != null && actual !== "";

  if (actual == null) return false;

  switch (op) {
    case "eq":  return String(actual) === String(expected);
    case "neq": return String(actual) !== String(expected);
    case "gt":  return Number(actual) > Number(expected);
    case "lt":  return Number(actual) < Number(expected);
    case "gte": return Number(actual) >= Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    case "contains":     return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case "not_contains": return !String(actual).toLowerCase().includes(String(expected).toLowerCase());
    default:    return false;
  }
}

function evaluateConditions(conditions: Condition[], data: Record<string, unknown>): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, data));
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export async function runAutomations(payload: TriggerPayload): Promise<void> {
  // Load all active automations for this tenant that match the trigger type
  const automations = await prisma.automation.findMany({
    where: {
      tenantId: payload.tenantId,
      isActive: true,
    },
  });

  const matching = automations.filter((a) => {
    const trigger = a.trigger as unknown as AutomationTrigger;
    return trigger.type === payload.type;
  });

  if (matching.length === 0) return;

  await Promise.all(
    matching.map((automation) =>
      runSingleAutomation(
        automation.id,
        payload,
        automation.conditions as unknown as Condition[],
        automation.actions as unknown as ActionConfig[]
      )
    )
  );
}

function buildLogSteps(
  triggerType: TriggerType,
  results: ActionResult[],
  status: string,
): AutomationLogStep[] {
  const steps: AutomationLogStep[] = [
    {
      kind: "trigger",
      title: "Gatilho disparado",
      detail: TRIGGER_LABELS[triggerType] ?? triggerType,
      status: "neutral",
    },
  ];

  for (const r of results) {
    steps.push({
      kind: "action",
      title: "Ação executada",
      detail: r.detail ?? r.type,
      status: r.success ? "success" : "failed",
      actionType: r.type as AutomationLogStep["actionType"],
    });
  }

  if (status === "skipped") {
    steps.push({
      kind: "outcome",
      title: "Ignorado",
      detail: "Condições do filtro não foram atendidas",
      status: "neutral",
    });
  } else if (status === "failed") {
    steps.push({ kind: "outcome", title: "Falhou", status: "failed" });
  } else {
    steps.push({ kind: "outcome", title: "Sucesso", status: "success" });
  }

  return steps;
}

async function runSingleAutomation(
  automationId: string,
  payload: TriggerPayload,
  conditions: Condition[],
  actions: ActionConfig[]
): Promise<void> {
  const conditionsMet = evaluateConditions(conditions, payload.data);

  if (!conditionsMet) {
    const steps = buildLogSteps(payload.type, [], "skipped");
    await prisma.automationLog.create({
      data: {
        automationId,
        tenantId: payload.tenantId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        status: "skipped",
        actionsRun: steps as object,
      },
    });
    return;
  }

  const results: ActionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action, payload);
    results.push(result);
  }

  const failed = results.filter((r) => !r.success);
  const status = failed.length === results.length && results.length > 0 ? "failed" : "success";
  const steps = buildLogSteps(payload.type, results, status);

  await prisma.$transaction([
    prisma.automationLog.create({
      data: {
        automationId,
        tenantId: payload.tenantId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        status,
        error: failed.length > 0 ? failed.map((f) => `${f.type}: ${f.error}`).join("; ") : null,
        actionsRun: steps as object,
      },
    }),
    prisma.automation.update({
      where: { id: automationId },
      data: {
        runCount: { increment: 1 },
        lastRunAt: new Date(),
      },
    }),
  ]);
}
