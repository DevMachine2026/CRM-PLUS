/** Estados visuais do fluxo de conexão por canal. */
export type ChannelConnectionState =
  | "disconnected"
  | "generating_qr"
  | "awaiting_scan"
  | "awaiting_pairing"
  | "connected"
  | "error";

export type IntegrationProvider = "meta" | "evolution";

export type WhatsAppCredentials = {
  provider?: IntegrationProvider;
  /** Evolution GO API */
  evolutionApiVersion?: "go";
  connectionState?: ChannelConnectionState;
  evolutionInstanceName?: string;
  evolutionInstanceId?: string;
  instanceToken?: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  accessToken?: string;
  verifyToken?: string;
  lastQrAt?: string;
  lastQrCodeBase64?: string;
  connectMethod?: "qr" | "pairing";
  targetPhone?: string;
  lastPairingCode?: string;
};

export type InstagramCredentials = {
  provider?: "meta";
  connectionState?: ChannelConnectionState;
  pageId?: string;
  pageName?: string;
  /** ID da conta Instagram Business (webhook recipient.id). */
  instagramAccountId?: string;
  accessToken?: string;
  verifyToken?: string;
};

export function parseWhatsAppCredentials(raw: unknown): WhatsAppCredentials {
  if (!raw || typeof raw !== "object") return {};
  return raw as WhatsAppCredentials;
}

export function parseInstagramCredentials(raw: unknown): InstagramCredentials {
  if (!raw || typeof raw !== "object") return {};
  return raw as InstagramCredentials;
}

function hasEvolutionPhone(creds: WhatsAppCredentials): boolean {
  const digits = creds.phoneNumber?.replace(/\D/g, "") ?? "";
  return digits.length >= 10;
}

export function whatsappUiState(creds: WhatsAppCredentials): ChannelConnectionState {
  if (creds.connectionState === "connected" && hasEvolutionPhone(creds)) {
    return "connected";
  }
  if (
    creds.provider === "evolution" &&
    creds.evolutionInstanceId &&
    (creds.connectionState === "awaiting_scan" ||
      creds.connectionState === "awaiting_pairing" ||
      creds.connectionState === "generating_qr")
  ) {
    return creds.connectionState ?? "awaiting_scan";
  }
  if (
    creds.connectionState === "generating_qr" ||
    creds.connectionState === "awaiting_scan" ||
    creds.connectionState === "awaiting_pairing"
  ) {
    return creds.connectionState;
  }
  if (creds.connectionState === "error") return "error";
  if (creds.phoneNumberId && creds.accessToken) return "connected";
  return "disconnected";
}

export function instagramUiState(creds: InstagramCredentials): ChannelConnectionState {
  if (creds.connectionState === "connected" || (creds.pageId && creds.accessToken)) {
    return "connected";
  }
  if (creds.connectionState === "error") return "error";
  return "disconnected";
}

export const CHANNEL_STATE_LABEL: Record<ChannelConnectionState, string> = {
  disconnected:    "Desconectado",
  generating_qr:   "Gerando QR Code…",
  awaiting_scan:   "Aguardando leitura…",
  awaiting_pairing: "Aguardando código no celular…",
  connected:       "Conectado",
  error:           "Erro na conexão",
};
