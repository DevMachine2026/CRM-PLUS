export type IntegrationChannel = "whatsapp" | "instagram";

export type MetaFieldKey =
  | "phoneNumberId"
  | "accessToken"
  | "verifyToken"
  | "pageId";

export type FieldHelp = {
  label: string;
  placeholder: string;
  secret?: boolean;
  help: string;
  docUrl?: string;
  docLabel?: string;
};

const WHATSAPP_FIELDS: Record<string, FieldHelp> = {
  phoneNumberId: {
    label: "Phone Number ID",
    placeholder: "Ex.: 123456789012345",
    help: "ID do número WhatsApp Business na Meta. Encontre em WhatsApp → API Setup no painel do app.",
    docUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
    docLabel: "Abrir guia Phone Number ID",
  },
  accessToken: {
    label: "Access Token",
    placeholder: "EAAxxxxxxxx…",
    secret: true,
    help: "Token permanente do app Meta com permissões whatsapp_business_messaging. Gere em Ferramentas → Graph API Explorer ou token do sistema.",
    docUrl: "https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#system-user-access-tokens",
    docLabel: "Como gerar o token",
  },
  verifyToken: {
    label: "Verify Token (webhook)",
    placeholder: "Crie uma senha forte (ex.: crm_plus_verify_2024)",
    help: "Texto secreto que você define aqui e repete igual no app Meta. O CRM valida este token automaticamente na verificação GET do webhook (hub.verify_token).",
    docUrl: "https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests",
    docLabel: "Verificação do webhook",
  },
};

const INSTAGRAM_FIELDS: Record<string, FieldHelp> = {
  pageId: {
    label: "Page ID (Instagram Business)",
    placeholder: "Ex.: 17841400000000000",
    help: "ID da Página Facebook vinculada à conta Instagram Business. Usado para rotear mensagens ao tenant correto.",
    docUrl: "https://developers.facebook.com/docs/messenger-platform/instagram",
    docLabel: "Documentação Instagram Messaging",
  },
  accessToken: {
    label: "Access Token",
    placeholder: "EAAxxxxxxxx…",
    secret: true,
    help: "Token com permissões instagram_manage_messages e pages_messaging. Mesmo app Meta usado para o webhook.",
    docUrl: "https://developers.facebook.com/docs/instagram-api/overview",
    docLabel: "Visão geral Instagram API",
  },
  verifyToken: {
    label: "Verify Token (webhook)",
    placeholder: "Mesmo valor usado no painel Meta",
    help: "Deve ser idêntico ao Verify Token no painel Meta. Usado na verificação automática do endpoint de webhook deste tenant.",
    docUrl: "https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests",
    docLabel: "Verificação do webhook",
  },
};

export function getFieldHelp(
  channel: IntegrationChannel,
  key: MetaFieldKey,
): FieldHelp | undefined {
  const map = channel === "whatsapp" ? WHATSAPP_FIELDS : INSTAGRAM_FIELDS;
  return map[key];
}

export function getChannelFieldKeys(channel: IntegrationChannel): MetaFieldKey[] {
  return channel === "whatsapp"
    ? ["phoneNumberId", "accessToken", "verifyToken"]
    : ["pageId", "accessToken", "verifyToken"];
}
