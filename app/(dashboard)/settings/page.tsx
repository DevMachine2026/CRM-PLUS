import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { parseTenantAiSettings } from "@/lib/ai/tenant-settings";

export default async function SettingsPage() {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "settings");

  const tenantId = session.tenantId;

  const [tenant, users] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, plan: true, status: true, settings: true, createdAt: true },
    }),
    can(session.role, "read", "team")
      ? prisma.user.findMany({
          where:   { tenantId },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select:  {
            id: true, name: true, email: true, phone: true,
            role: true, isActive: true, lastLoginAt: true, createdAt: true,
          },
        })
      : [],
  ]);

  if (!tenant) redirect("/dashboard");

  return (
    <SettingsClient
      tenant={{ ...tenant, createdAt: tenant.createdAt.toISOString() }}
      aiSettings={parseTenantAiSettings(tenant.settings)}
      users={users.map((u) => ({
        ...u,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt:   u.createdAt.toISOString(),
      }))}
      currentUserId={session.id}
      canUpdateSettings={can(session.role, "update", "settings")}
      canReadTeam={can(session.role, "read", "team")}
      canCreateTeam={can(session.role, "create", "team")}
      canUpdateTeam={can(session.role, "update", "team")}
      canDeleteTeam={can(session.role, "delete", "team")}
    />
  );
}
