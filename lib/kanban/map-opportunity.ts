import type { KanbanOpportunity } from "./types";

type RawContact = {
  id: string;
  name: string;
  updatedAt: Date;
  tags: { tag: { id: string; name: string; color: string | null } }[];
  conversations: { channel: string; lastMessageAt: Date | null }[];
} | null;

type RawOpp = {
  id: string;
  title: string;
  value: unknown;
  status: "open" | "won" | "lost";
  expectedCloseAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contact: RawContact;
  company: { id: string; name: string } | null;
  stage: { id: string; name: string; probability: number };
  assignedUser: { id: string; name: string } | null;
  products: unknown[];
  tags: { tag: { id: string; name: string; color: string | null } }[];
};

function mapContact(contact: RawContact): KanbanOpportunity["contact"] {
  if (!contact) return null;
  const latest = contact.conversations[0];
  return {
    id: contact.id,
    name: contact.name,
    updatedAt: contact.updatedAt,
    sourceChannel: (latest?.channel ?? null) as "whatsapp" | "instagram" | "email" | "manual" | null,
    lastConversationAt: latest?.lastMessageAt ?? null,
    tags: contact.tags.map((t) => t.tag),
  };
}

export function mapOpportunityForKanban<TProducts = KanbanOpportunity["products"]>(
  o: RawOpp & { products: TProducts },
): Omit<KanbanOpportunity, "products"> & { products: TProducts } {
  return {
    id: o.id,
    title: o.title,
    value: o.value,
    status: o.status,
    expectedCloseAt: o.expectedCloseAt,
    closedAt: o.closedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    contact: mapContact(o.contact),
    company: o.company,
    stage: o.stage,
    assignedUser: o.assignedUser,
    products: o.products,
    tags: o.tags.map((t) => t.tag),
  };
}
