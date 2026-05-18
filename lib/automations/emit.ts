import { runAutomations } from "./engine";
import type { TriggerPayload, TriggerType } from "./types";

/** Fire-and-forget — never blocks the caller or throws to the API layer. */
export function emitAutomation(payload: TriggerPayload): void {
  runAutomations(payload).catch((err) => {
    console.error(`[automations] ${payload.type} (${payload.entityId}):`, err);
  });
}

function base(
  type: TriggerType,
  tenantId: string,
  entityType: TriggerPayload["entityType"],
  entityId: string,
  data: Record<string, unknown>
): void {
  emitAutomation({ type, tenantId, entityType, entityId, data });
}

export function emitContactCreated(
  tenantId: string,
  contact: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    status: string;
  }
): void {
  base("contact_created", tenantId, "contact", contact.id, {
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      status: contact.status,
    },
  });
}

export function emitContactStatusChanged(
  tenantId: string,
  contactId: string,
  fromStatus: string,
  toStatus: string
): void {
  base("contact_status_changed", tenantId, "contact", contactId, {
    contact: { id: contactId, status: toStatus },
    fromStatus,
    toStatus,
  });
}

export function emitConversationCreated(
  tenantId: string,
  conversation: {
    id: string;
    contactId: string | null;
    channel: string;
    status: string;
  }
): void {
  base("conversation_created", tenantId, "conversation", conversation.id, {
    conversation: {
      id: conversation.id,
      channel: conversation.channel,
      status: conversation.status,
    },
    contactId: conversation.contactId,
  });
}

export function emitOpportunityCreated(
  tenantId: string,
  opportunity: {
    id: string;
    title: string;
    status: string;
    stageId: string;
    contactId: string | null;
    value?: unknown;
  }
): void {
  base("opportunity_created", tenantId, "opportunity", opportunity.id, {
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      status: opportunity.status,
      stageId: opportunity.stageId,
      value: opportunity.value ?? null,
    },
    contactId: opportunity.contactId,
  });
}

export function emitOpportunityStatusChanged(
  tenantId: string,
  opportunityId: string,
  fromStatus: string,
  toStatus: string,
  contactId: string | null
): void {
  base("opportunity_status_changed", tenantId, "opportunity", opportunityId, {
    opportunity: { id: opportunityId, status: toStatus },
    fromStatus,
    toStatus,
    contactId,
  });
}

export function emitOpportunityStageChanged(
  tenantId: string,
  opportunityId: string,
  fromStageId: string,
  toStageId: string,
  contactId: string | null
): void {
  base("opportunity_stage_changed", tenantId, "opportunity", opportunityId, {
    opportunity: { id: opportunityId, stageId: toStageId },
    fromStageId,
    toStageId,
    contactId,
  });
}

export function emitTaskCreated(
  tenantId: string,
  task: {
    id: string;
    title: string;
    contactId: string | null;
    opportunityId: string | null;
    source: string | null;
  }
): void {
  base("task_created", tenantId, "task", task.id, {
    task: { id: task.id, title: task.title, source: task.source },
    contactId: task.contactId,
    opportunityId: task.opportunityId,
  });
}

export function emitRevenueStatusChanged(
  tenantId: string,
  revenueId: string,
  fromStatus: string,
  toStatus: string,
  opportunityId: string
): void {
  base("revenue_status_changed", tenantId, "revenue", revenueId, {
    revenue: { id: revenueId, status: toStatus },
    fromStatus,
    toStatus,
    opportunityId,
  });
}
