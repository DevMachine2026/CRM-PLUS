import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { TagsClient } from "./tags-client";

export default async function TagsPage() {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "tags");

  const tags = await prisma.tag.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      createdAt: true,
      _count: { select: { contacts: true } },
    },
  });

  return (
    <TagsClient
      tags={tags}
      canCreate={can(session.role, "create", "tags")}
      canEdit={can(session.role, "update", "tags")}
      canDelete={can(session.role, "delete", "tags")}
    />
  );
}
