/**
 * @deprecated Import from evolution-go-client — mantido para imports existentes.
 */
export {
  isEvolutionGoSimulated as isSimulated,
  evolutionInstanceName,
  resolveCrmWebhookUrl,
  startGoWhatsAppSession as createOrConnectInstance,
  getGoConnectionState as getConnectionState,
  refreshGoQrCode,
  type EvolutionGoSession as EvolutionSession,
} from "./evolution-go-client";

/** Webhook GO é configurado em POST /instance/connect — no-op para compat. */
export async function setEvolutionWebhook(_instanceName: string, _webhookUrl: string): Promise<void> {
  /* Evolution GO: webhook no connect */
}
