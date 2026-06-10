/** Disponibilidade de envio outbound por canal (safe para client components). */
export type OutboundAvailability = {
  whatsapp: boolean;
  instagram: boolean;
};

export function canSendOnChannel(
  channel: string,
  availability: OutboundAvailability,
): boolean {
  if (channel === "manual" || channel === "email") return true;
  if (channel === "whatsapp") return availability.whatsapp;
  if (channel === "instagram") return availability.instagram;
  return true;
}
