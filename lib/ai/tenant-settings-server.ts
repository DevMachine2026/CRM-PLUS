import { prisma } from "@/lib/db/client";
import { isAiEnabled } from "@/lib/ai/tenant-settings";

export async function loadTenantAiEnabled(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  return isAiEnabled(tenant?.settings);
}
