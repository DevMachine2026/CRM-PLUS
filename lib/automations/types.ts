// ─── Triggers ─────────────────────────────────────────────────────────────────

export type TriggerType =
  | "contact_created"
  | "contact_status_changed"
  | "opportunity_created"
  | "opportunity_status_changed"
  | "opportunity_stage_changed"
  | "task_created"
  | "revenue_status_changed"
  | "conversation_created";

export interface AutomationTrigger {
  type: TriggerType;
}

// ─── Conditions ───────────────────────────────────────────────────────────────

export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty";

export interface Condition {
  field: string;          // e.g. "contact.status", "opportunity.value"
  operator: ConditionOperator;
  value?: string | number | boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type ActionType =
  | "send_whatsapp"
  | "send_instagram"
  | "create_task"
  | "update_contact_status"
  | "add_tag"
  | "create_activity"
  | "update_opportunity_stage";

export interface ActionBase {
  type: ActionType;
}

export interface SendWhatsAppAction extends ActionBase {
  type: "send_whatsapp";
  message: string;
}

export interface SendInstagramAction extends ActionBase {
  type: "send_instagram";
  message: string;
}

export interface CreateTaskAction extends ActionBase {
  type: "create_task";
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDays?: number; // days from now
}

export interface UpdateContactStatusAction extends ActionBase {
  type: "update_contact_status";
  status: "lead" | "customer" | "inactive";
}

export interface AddTagAction extends ActionBase {
  type: "add_tag";
  tagName: string;
}

export interface CreateActivityAction extends ActionBase {
  type: "create_activity";
  activityType: "call" | "meeting" | "email" | "note" | "whatsapp" | "instagram";
  title: string;
  description?: string;
}

export interface UpdateOpportunityStageAction extends ActionBase {
  type: "update_opportunity_stage";
  stageId: string;
}

export type ActionConfig =
  | SendWhatsAppAction
  | SendInstagramAction
  | CreateTaskAction
  | UpdateContactStatusAction
  | AddTagAction
  | CreateActivityAction
  | UpdateOpportunityStageAction;

// ─── Automation definition ─────────────────────────────────────────────────────

export interface AutomationDefinition {
  trigger: AutomationTrigger;
  conditions: Condition[];
  actions: ActionConfig[];
}

// ─── Engine payload ───────────────────────────────────────────────────────────

export interface TriggerPayload {
  type: TriggerType;
  tenantId: string;
  entityType: "contact" | "opportunity" | "task" | "revenue" | "conversation";
  entityId: string;
  data: Record<string, unknown>;
}

// ─── Labels for UI ────────────────────────────────────────────────────────────

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  contact_created: "Contato criado",
  contact_status_changed: "Status do contato alterado",
  opportunity_created: "Oportunidade criada",
  opportunity_status_changed: "Status da oportunidade alterado",
  opportunity_stage_changed: "Etapa da oportunidade alterada",
  task_created: "Tarefa criada",
  revenue_status_changed: "Status do pagamento alterado",
  conversation_created: "Conversa iniciada",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  send_whatsapp: "Enviar mensagem WhatsApp",
  send_instagram: "Enviar mensagem Instagram",
  create_task: "Criar tarefa",
  update_contact_status: "Atualizar status do contato",
  add_tag: "Adicionar tag",
  create_activity: "Registrar atividade",
  update_opportunity_stage: "Mover para etapa do pipeline",
};

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  eq: "é igual a",
  neq: "não é igual a",
  gt: "maior que",
  lt: "menor que",
  gte: "maior ou igual a",
  lte: "menor ou igual a",
  contains: "contém",
  not_contains: "não contém",
  is_empty: "está vazio",
  is_not_empty: "não está vazio",
};
