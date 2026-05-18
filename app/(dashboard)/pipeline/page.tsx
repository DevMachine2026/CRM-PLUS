import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { ensureDefaultPipeline } from "@/lib/db/ensure-default-pipeline";
import { PipelineClient } from "./pipeline-client";

export default async function PipelinePage() {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "pipelines");

  await ensureDefaultPipeline(session.tenantId);

  const pipelines = await prisma.pipeline.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
      createdAt: true,
      stages: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, order: true, probability: true },
      },
    },
  });

  return (
    <PipelineClient
      pipelines={pipelines}
      canCreate={can(session.role, "create", "pipelines")}
      canEdit={can(session.role, "update", "pipelines")}
      canDelete={can(session.role, "delete", "pipelines")}
    />
  );
}
