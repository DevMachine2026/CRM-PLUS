import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { InboxClient } from "./inbox-client";
import {
  HIGH_PRIORITY_MIN,
  HOT_PRIORITY_MIN,
} from "@/lib/inbox/conversation-priority";
import type { ConversationStatus, ConversationChannel } from "@/lib/generated/prisma/enums";

const VALID_STATUSES:  ConversationStatus[]  = ["open", "pending", "resolved"];
const VALID_CHANNELS:  ConversationChannel[] = ["manual", "whatsapp", "instagram", "email"];
const VALID_PRIORITY = ["high", "all"] as const;
type PriorityFilter = (typeof VALID_PRIORITY)[number];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string; convId?: string; priority?: string }>;
}) {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "conversations");

  const tenantId = session.tenantId;
  const p = await searchParams;

  const statusFilter: ConversationStatus | undefined =
    p.status && VALID_STATUSES.includes(p.status as ConversationStatus)
      ? (p.status as ConversationStatus) : undefined;

  const channelFilter: ConversationChannel | undefined =
    p.channel && VALID_CHANNELS.includes(p.channel as ConversationChannel)
      ? (p.channel as ConversationChannel) : undefined;

  const priorityFilter: PriorityFilter =
    p.priority === "high" ? "high" : "all";

  const highPriorityWhere = {
    OR: [
      { priorityScore: { gte: HIGH_PRIORITY_MIN } },
      { contact: { leadScore: { gte: HIGH_PRIORITY_MIN } } },
    ],
  };

  const where = {
    tenantId,
    ...(statusFilter  ? { status:  statusFilter  } : {}),
    ...(channelFilter ? { channel: channelFilter } : {}),
    ...(priorityFilter === "high" ? highPriorityWhere : {}),
  };

  const todayStart = startOfToday();

  const [conversations, contacts, statusCounts, hotTodayCount] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: [
        { priorityScore: "desc" },
        { contact: { leadScore: "desc" } },
        { lastMessageAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 60,
      select: {
        id:             true,
        channel:        true,
        status:         true,
        subject:        true,
        lastMessageAt:  true,
        createdAt:      true,
        detectedIntent: true,
        summaryText:    true,
        priorityScore:  true,
        nextBestAction: true,
        contact: {
          select: { id: true, name: true, email: true, leadScore: true },
        },
        assignedUser: { select: { id: true, name: true } },
        messages: {
          orderBy: { sentAt: "desc" },
          take: 1,
          select: { content: true, direction: true, sentAt: true },
        },
      },
    }),
    prisma.contact.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.conversation.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.conversation.count({
      where: {
        tenantId,
        status: { in: ["open", "pending"] },
        lastMessageAt: { gte: todayStart },
        OR: [
          { priorityScore: { gte: HOT_PRIORITY_MIN } },
          { contact: { leadScore: { gte: HOT_PRIORITY_MIN } } },
        ],
      },
    }),
  ]);

  let activeConversation: {
    id: string; channel: string; status: string; subject: string | null;
    lastMessageAt: Date | null; createdAt: Date;
    detectedIntent: string | null; summaryText: string | null;
    priorityScore: number; nextBestAction: string | null;
    contact: { id: string; name: string; email: string | null; leadScore: number } | null;
    assignedUser: { id: string; name: string } | null;
    messages: {
      id: string; content: string; direction: string; senderType: string;
      type: string; sentAt: Date; externalStatus: string | null; deliveryError: string | null;
    }[];
  } | null = null;

  if (p.convId) {
    activeConversation = await prisma.conversation.findFirst({
      where: { id: p.convId, tenantId },
      select: {
        id: true, channel: true, status: true, subject: true,
        lastMessageAt: true, createdAt: true,
        detectedIntent: true, summaryText: true,
        priorityScore: true, nextBestAction: true,
        contact: { select: { id: true, name: true, email: true, leadScore: true } },
        assignedUser: { select: { id: true, name: true } },
        messages: {
          orderBy: { sentAt: "asc" },
          select: {
            id: true, content: true, direction: true, type: true,
            senderType: true, sentAt: true,
            externalStatus: true, deliveryError: true,
          },
        },
      },
    });
  }

  const sc = Object.fromEntries(statusCounts.map((c) => [c.status, c._count._all])) as Record<string, number>;
  const canCreate = can(session.role, "create", "conversations");
  const canUpdate = can(session.role, "update", "conversations");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (v: unknown) => JSON.parse(JSON.stringify(v)) as any;

  return (
    <InboxClient
      conversations={s(conversations)}
      contacts={contacts}
      statusCounts={sc}
      hotTodayCount={hotTodayCount}
      priorityFilter={priorityFilter}
      activeConversation={activeConversation ? s(activeConversation) : null}
      currentUserId={session.id}
      canCreate={canCreate}
      canUpdate={canUpdate}
    />
  );
}
