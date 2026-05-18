export type KanbanTag = {
  id: string;
  name: string;
  color: string | null;
};

export type KanbanStage = {
  id: string;
  name: string;
  order: number;
  probability: number;
};

export type KanbanOpportunity = {
  id: string;
  title: string;
  value: unknown;
  status: "open" | "won" | "lost";
  expectedCloseAt: Date | string | null;
  closedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  contact: {
    id: string;
    name: string;
    updatedAt: Date | string;
    sourceChannel: "whatsapp" | "instagram" | "email" | "manual" | null;
    lastConversationAt: Date | string | null;
    tags: KanbanTag[];
  } | null;
  company: { id: string; name: string } | null;
  stage: { id: string; name: string; probability: number };
  assignedUser: { id: string; name: string } | null;
  products: { id: string }[];
  tags: KanbanTag[];
};

export type OptimisticMove = {
  oppId: string;
  stage: { id: string; name: string; probability: number };
};
