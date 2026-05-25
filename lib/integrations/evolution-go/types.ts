/** Método de pareamento WhatsApp via Evolution GO. */
export type WhatsAppConnectMethod = "qr" | "pairing";

export type GoConnectRequest = {
  method?: WhatsAppConnectMethod;
  /** E.164 sem + (ex.: 5511987654321) — obrigatório se method=pairing */
  phone?: string;
  /** Remove instância antiga no GO antes de criar (recomendado ao trocar número) */
  reset?: boolean;
};

export type GoConnectResult = {
  instanceName: string;
  instanceId: string;
  instanceToken: string;
  method: WhatsAppConnectMethod;
  qrCodeBase64?: string;
  pairingCode?: string;
  targetPhone?: string;
};
