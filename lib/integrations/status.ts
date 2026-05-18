import type { IntegrationChannel } from "./meta-field-help";
import { getChannelFieldKeys } from "./meta-field-help";

export type IntegrationConnectionStatus = "connected" | "partial" | "empty";

export function getIntegrationConnectionStatus(
  channel: IntegrationChannel,
  configuredKeys: string[],
): IntegrationConnectionStatus {
  const required = getChannelFieldKeys(channel);
  const set = new Set(configuredKeys);
  const filled = required.filter((k) => set.has(k)).length;

  if (filled === 0) return "empty";
  if (filled >= required.length) return "connected";
  return "partial";
}

export const STATUS_LABELS: Record<
  IntegrationConnectionStatus,
  { label: string; description: string }
> = {
  connected: {
    label: "Conectado",
    description: "Credenciais salvas. Mensagens podem ser roteadas para sua conta.",
  },
  partial: {
    label: "Incompleto",
    description: "Alguns campos ainda faltam. Complete todos para ativar o canal.",
  },
  empty: {
    label: "Não configurado",
    description: "Conecte este canal para receber mensagens do Meta na caixa de entrada.",
  },
};
