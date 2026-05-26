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

function toIso(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  return d instanceof Date ? d.toISOString() : d;
}

/** Prisma `Decimal` e similares → número serializável no client. */
function toNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "toNumber" in v && typeof (v as { toNumber: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Serializa `Date` para string — obrigatório ao passar props para Client Components. */
export function mapOpportunityForKanban<TProducts = KanbanOpportunity["products"]>(
  o: RawOpp & { products: TProducts },
): Omit<KanbanOpportunity, "products"> & { products: TProducts } {
  const contact = mapContact(o.contact);
  return {
    id: o.id,
    title: o.title,
    value: toNumber(o.value),
    status: o.status,
    expectedCloseAt: toIso(o.expectedCloseAt),
    closedAt: toIso(o.closedAt),
    createdAt: toIso(o.createdAt)!,
    updatedAt: toIso(o.updatedAt)!,
    contact: contact
      ? {
          ...contact,
          updatedAt: toIso(contact.updatedAt)!,
          lastConversationAt: toIso(contact.lastConversationAt),
        }
      : null,
    company: o.company,
    stage: o.stage,
    assignedUser: o.assignedUser,
    products: o.products,
    tags: o.tags.map((t) => t.tag),
  };
}
