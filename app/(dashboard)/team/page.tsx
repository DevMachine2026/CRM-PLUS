import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { can } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { TeamClient } from "./team-client";

export const metadata = { title: "Equipe — CRM PLUS" };

export default async function TeamPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!can(session.user.role, "read", "team")) redirect("/dashboard");

  const users = await prisma.user.findMany({
    where:   { tenantId: session.user.tenantId },
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
      currentUserId={session.user.id}
      canCreate={can(session.user.role, "create", "team")}
      canUpdate={can(session.user.role, "update", "team")}
      canDelete={can(session.user.role, "delete", "team")}
    />
  );
}
