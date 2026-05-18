import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "contacts");

  const params = await searchParams;
  const search = params.q ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 20;

  const where = {
    tenantId: session.tenantId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [contacts, total, allTags] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        leadScore: true,
        createdAt: true,
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    }),
    prisma.contact.count({ where }),
    prisma.tag.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const contactsWithTags = contacts.map((c) => ({
    ...c,
    tags: c.tags.map((ct) => ct.tag),
  }));

  return (
    <ContactsClient
      contacts={contactsWithTags}
      allTags={allTags}
      total={total}
      page={page}
      search={search}
      canCreate={can(session.role, "create", "contacts")}
      canEdit={can(session.role, "update", "contacts")}
      canDelete={can(session.role, "delete", "contacts")}
    />
  );
}
