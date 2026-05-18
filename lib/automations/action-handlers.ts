import { prisma } from "@/lib/db/client";
import { sendChannelMessage } from "@/lib/channels/send-message";
import type {
  ActionConfig,
  TriggerPayload,
  SendWhatsAppAction,
  SendInstagramAction,
  CreateTaskAction,
  UpdateContactStatusAction,
  AddTagAction,
  CreateActivityAction,
  UpdateOpportunityStageAction,
} from "./types";

export interface ActionResult {
  type: string;
  success: boolean;
  error?: string;
  /** Texto amigável para timeline de logs */
  detail?: string;
}

async function handleSendWhatsApp(
  action: SendWhatsAppAction,
  payload: TriggerPayload
): Promise<ActionResult> {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: payload.entityId, tenantId: payload.tenantId },
      select: { phone: true },
    });

    if (!contact?.phone) {
      return { type: action.type, success: false, error: "Contato sem telefone cadastrado" };
    }

    const result = await sendChannelMessage({
      channel: "whatsapp",
      content: action.message,
      recipientPhone: contact.phone,
    });

    if (result.externalStatus === "failed") {
      return { type: action.type, success: false, error: result.deliveryError };
    }

    return { type: action.type, success: true, detail: "Mensagem WhatsApp enviada" };
  } catch (err) {
    return { type: action.type, success: false, error: String(err) };
  }
}

async function handleSendInstagram(
  action: SendInstagramAction,
  payload: TriggerPayload
): Promise<ActionResult> {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: payload.entityId, tenantId: payload.tenantId },
      select: { externalId: true },
    });

    if (!contact?.externalId) {
      return { type: action.type, success: false, error: "Contato sem PSID do Instagram" };
    }

    const result = await sendChannelMessage({
      channel: "instagram",
      content: action.message,
      recipientPsid: contact.externalId,
    });

    if (result.externalStatus === "failed") {
      return { type: action.type, success: false, error: result.deliveryError };
    }

    return { type: action.type, success: true, detail: "Mensagem Instagram enviada" };
  } catch (err) {
    return { type: action.type, success: false, error: String(err) };
  }
}

function resolveContactId(payload: TriggerPayload): string | null {
  if (payload.entityType === "contact") return payload.entityId;
  return (payload.data.contactId as string | undefined) ?? null;
}

async function handleCreateTask(
  action: CreateTaskAction,
  payload: TriggerPayload
): Promise<ActionResult> {
  try {
    const dueAt = action.dueDays
      ? new Date(Date.now() + action.dueDays * 86_400_000)
      : null;

    const contactId = resolveContactId(payload);

    const opportunityId =
      payload.entityType === "opportunity" ? payload.entityId : null;

    await prisma.task.create({
      data: {
        tenantId: payload.tenantId,
        title: action.title,
        description: action.description ?? null,
        priority: action.priority ?? "medium",
        source: "automation",
        dueAt,
        contactId: contactId ?? null,
        opportunityId: opportunityId ?? null,
      },
    });

    return {
      type: action.type,
      success: true,
      detail: `Follow-up agendado: ${action.title}`,
    };
  } catch (err) {
    return { type: action.type, success: false, error: String(err) };
  }
}

async function handleUpdateContactStatus(
  action: UpdateContactStatusAction,
  payload: TriggerPayload
): Promise<ActionResult> {
  try {
    const contactId =
      payload.entityType === "contact"
        ? payload.entityId
        : (payload.data.contactId as string | undefined);

    if (!contactId) {
      return { type: action.type, success: false, error: "Nenhum contato associado ao evento" };
    }

    await prisma.contact.update({
      where: { id: contactId, tenantId: payload.tenantId },
      data: { status: action.status },
    });

    return { type: action.type, success: true, detail: `Status atualizado para ${action.status}` };
  } catch (err) {
    return { type: action.type, success: false, error: String(err) };
  }
}

async function handleAddTag(
  action: AddTagAction,
  payload: TriggerPayload
): Promise<ActionResult> {
  try {
    const contactId =
      payload.entityType === "contact"
        ? payload.entityId
        : (payload.data.contactId as string | undefined);

    if (!contactId) {
      return { type: action.type, success: false, error: "Nenhum contato associado ao evento" };
    }

    const tag = await prisma.tag.upsert({
      where: { tenantId_name: { tenantId: payload.tenantId, name: action.tagName } },
      create: { tenantId: payload.tenantId, name: action.tagName },
      update: {},
    });

    await prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId, tagId: tag.id } },
      create: { contactId, tagId: tag.id },
      update: {},
    });

    return { type: action.type, success: true, detail: `Tag "${action.tagName}" aplicada` };
  } catch (err) {
    return { type: action.type, success: false, error: String(err) };
  }
}

async function handleCreateActivity(
  action: CreateActivityAction,
  payload: TriggerPayload
): Promise<ActionResult> {
  try {
    const contactId = resolveContactId(payload);

    const opportunityId =
      payload.entityType === "opportunity" ? payload.entityId : null;

    await prisma.activity.create({
      data: {
        tenantId: payload.tenantId,
        type: action.activityType,
        title: action.title,
        description: action.description ?? null,
        contactId: contactId ?? null,
        opportunityId: opportunityId ?? null,
      },
    });

    return { type: action.type, success: true, detail: `Atividade registrada: ${action.title}` };
  } catch (err) {
    return { type: action.type, success: false, error: String(err) };
  }
}

async function handleUpdateOpportunityStage(
  action: UpdateOpportunityStageAction,
  payload: TriggerPayload
): Promise<ActionResult> {
  try {
    const opportunityId =
      payload.entityType === "opportunity" ? payload.entityId : null;

    if (!opportunityId) {
      return { type: action.type, success: false, error: "Nenhuma oportunidade associada ao evento" };
    }

    const stage = await prisma.pipelineStage.findFirst({
      where: { id: action.stageId, tenantId: payload.tenantId },
    });

    if (!stage) {
      return { type: action.type, success: false, error: "Etapa não encontrada" };
    }

    await prisma.opportunity.update({
      where: { id: opportunityId, tenantId: payload.tenantId },
      data: { stageId: action.stageId },
    });

    return { type: action.type, success: true, detail: `Movido para etapa ${stage.name}` };
  } catch (err) {
    return { type: action.type, success: false, error: String(err) };
  }
}

export async function executeAction(
  action: ActionConfig,
  payload: TriggerPayload
): Promise<ActionResult> {
  switch (action.type) {
    case "send_whatsapp":
      return handleSendWhatsApp(action, payload);
    case "send_instagram":
      return handleSendInstagram(action, payload);
    case "create_task":
      return handleCreateTask(action, payload);
    case "update_contact_status":
      return handleUpdateContactStatus(action, payload);
    case "add_tag":
      return handleAddTag(action, payload);
    case "create_activity":
      return handleCreateActivity(action, payload);
    case "update_opportunity_stage":
      return handleUpdateOpportunityStage(action, payload);
    default:
      return { type: (action as ActionConfig).type, success: false, error: "Tipo de ação desconhecido" };
  }
}
