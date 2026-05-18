import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { AutomationsClient } from "./automations-client";

export const metadata = { title: "Automações — CRM PLUS" };

export default async function AutomationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenantId = session.user.tenantId;
  const role = session.user.role;

  const [automations, automationLogs, stages] = await Promise.all([
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
        entityType: true,
        entityId: true,
        status: true,
        error: true,
        actionsRun: true,
        createdAt: true,
        automation: { select: { id: true, name: true } },
      },
    }),
    prisma.pipelineStage.findMany({
      where: { tenantId },
      select: { id: true, name: true, pipeline: { select: { name: true } } },
      orderBy: [{ pipeline: { name: "asc" } }, { order: "asc" }],
    }),
  ]);

  return (
    <AutomationsClient
      automations={automations.map((a) => ({
        ...a,
        lastRunAt: a.lastRunAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      }))}
      logs={automationLogs.map((l) => ({
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
