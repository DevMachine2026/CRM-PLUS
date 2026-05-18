import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { TeamClient } from "./team-client";

export const metadata = { title: "Equipe — CRM PLUS" };

export default async function TeamPage() {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "team");

  const users = await prisma.user.findMany({
    where:   { tenantId: session.tenantId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select:  {
      id: true, name: true, email: true, phone: true,
      role: true, isActive: true, lastLoginAt: true, createdAt: true,
    },
  });

  return (
    <TeamClient
      users={users.map((u) => ({
        ...u,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt:   u.createdAt.toISOString(),
      }))}
      currentUserId={session.id}
      canCreate={can(session.role, "create", "team")}
      canUpdate={can(session.role, "update", "team")}
      canDelete={can(session.role, "delete", "team")}
    />
  );
}
