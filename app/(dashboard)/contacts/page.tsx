import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { ContactsClient } from "./contacts-client";
import type { ContactStatus, ConversationChannel } from "@/lib/generated/prisma/enums";

const VALID_STATUSES: ContactStatus[] = ["lead", "customer", "inactive"];
const VALID_CHANNELS: ConversationChannel[] = ["manual", "whatsapp", "instagram", "email"];
const VALID_SCORES = ["hot", "warm", "cold"] as const;
type ScoreFilter = (typeof VALID_SCORES)[number];

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string; channel?: string; score?: string }>;
}) {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "contacts");

  const params = await searchParams;
  const search = params.q ?? "";
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 20;

  const statusFilter: ContactStatus | undefined =
    params.status && VALID_STATUSES.includes(params.status as ContactStatus)
      ? (params.status as ContactStatus) : undefined;
  const channelFilter: ConversationChannel | undefined =
    params.channel && VALID_CHANNELS.includes(params.channel as ConversationChannel)
      ? (params.channel as ConversationChannel) : undefined;
  const scoreFilter: ScoreFilter | undefined =
    params.score && VALID_SCORES.includes(params.score as ScoreFilter)
      ? (params.score as ScoreFilter) : undefined;

  const scoreWhere =
    scoreFilter === "hot"  ? { leadScore: { gte: 70 } } :
    scoreFilter === "warm" ? { leadScore: { gte: 35, lt: 70 } } :
    scoreFilter === "cold" ? { leadScore: { lt: 35 } } :
    {};

  const where = {
    tenantId: session.tenantId,
    ...(statusFilter  ? { status: statusFilter } : {}),
    ...(channelFilter ? { conversations: { some: { channel: channelFilter } } } : {}),
    ...scoreWhere,
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
        externalId: true,
        status: true,
        leadScore: true,
        createdAt: true,
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        conversations: {
          where: { channel: "whatsapp" },
          orderBy: { lastMessageAt: "desc" },
          take: 1,
          select: { id: true },
        },
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
      statusFilter={statusFilter ?? ""}
      channelFilter={channelFilter ?? ""}
      scoreFilter={scoreFilter ?? ""}
      canCreate={can(session.role, "create", "contacts")}
      canEdit={can(session.role, "update", "contacts")}
      canDelete={can(session.role, "delete", "contacts")}
    />
  );
}
