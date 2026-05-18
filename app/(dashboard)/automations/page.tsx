import { prisma } from "@/lib/db/client";
import { requirePageSession } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { AutomationsClient } from "./automations-client";
import type { AutomationTrigger } from "@/lib/automations/types";
import type { ActionsRunRaw } from "@/lib/automations/log-timeline";

export const metadata = { title: "Automações — CRM PLUS" };

const AI_CORRELATION_MS = 5 * 60 * 1000;

export default async function AutomationsPage() {
  const session = await requirePageSession();
  const tenantId = session.tenantId;
  const role = session.role;

  const [automations, automationLogs, stages, aiLogsRecent] = await Promise.all([
    prisma.automation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        trigger: true,
        conditions: true,
        actions: true,
        runCount: true,
        lastRunAt: true,
        createdAt: true,
      },
    }),
    prisma.automationLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        automationId: true,
        entityType: true,
        entityId: true,
        status: true,
        error: true,
        actionsRun: true,
        createdAt: true,
        automation: { select: { id: true, name: true, trigger: true } },
      },
    }),
    prisma.pipelineStage.findMany({
      where: { tenantId },
      select: { id: true, name: true, pipeline: { select: { name: true } } },
      orderBy: [{ pipeline: { name: "asc" } }, { order: "asc" }],
    }),
    prisma.aiLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        outputSummary: true,
        createdAt: true,
      },
    }),
  ]);

  const triggerByAutomationId = new Map(
    automations.map((a) => [a.id, a.trigger as unknown as AutomationTrigger]),
  );

  const logsWithAi = automationLogs.map((log) => {
    const logTime = log.createdAt.getTime();
    const correlated =
      log.entityId == null
        ? []
        : aiLogsRecent.filter((ai) => {
            if (ai.entityId !== log.entityId) return false;
            const dt = Math.abs(ai.createdAt.getTime() - logTime);
            return dt <= AI_CORRELATION_MS;
          });

    const trigger =
      (log.automation?.trigger as unknown as AutomationTrigger | undefined) ??
      (log.automationId ? triggerByAutomationId.get(log.automationId) : undefined);

    return {
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      status: log.status,
      error: log.error,
      actionsRun: log.actionsRun as ActionsRunRaw,
      createdAt: log.createdAt.toISOString(),
      automationName: log.automation?.name ?? "Automação removida",
      trigger: trigger ?? null,
      aiLogs: correlated.map((ai) => ({
        action: ai.action,
        outputSummary: ai.outputSummary,
      })),
    };
  });

  return (
    <AutomationsClient
      automations={automations.map((a) => ({
        ...a,
        lastRunAt: a.lastRunAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      }))}
      logs={logsWithAi}
      aiLogs={aiLogsRecent.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      }))}
      stages={stages.map((s) => ({
        id: s.id,
        name: s.name,
        pipelineName: s.pipeline.name,
      }))}
      canCreate={can(role, "create", "automations")}
      canEdit={can(role, "update", "automations")}
      canDelete={can(role, "delete", "automations")}
    />
  );
}
