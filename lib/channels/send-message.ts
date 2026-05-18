import { sendWhatsAppMessage } from "./whatsapp";
import { sendInstagramMessage } from "./instagram";
import {
  loadWhatsAppCredentials,
  loadInstagramCredentials,
} from "@/lib/integrations/credentials";

export interface OutboundPayload {
  tenantId: string;
  channel: "whatsapp" | "instagram" | "manual" | "email";
  content: string;
  recipientPhone?: string;
  recipientPsid?: string;
}

export interface ChannelSendResult {
  externalId: string | null;
  externalStatus: string;
  deliveryError?: string;
}

export async function sendChannelMessage(
  payload: OutboundPayload,
): Promise<ChannelSendResult> {
  const { channel, content, tenantId } = payload;

  if (channel === "whatsapp") {
    if (!payload.recipientPhone) {
      return {
        externalId: null,
        externalStatus: "failed",
        deliveryError: "recipientPhone required for whatsapp",
      };
    }
    const cfg = await loadWhatsAppCredentials(tenantId);
    return sendWhatsAppMessage(payload.recipientPhone, content, cfg);
  }

  if (channel === "instagram") {
    if (!payload.recipientPsid) {
      return {
        externalId: null,
        externalStatus: "failed",
        deliveryError: "recipientPsid required for instagram",
      };
    }
    const cfg = await loadInstagramCredentials(tenantId);
    return sendInstagramMessage(payload.recipientPsid, content, cfg);
  }

  return { externalId: null, externalStatus: "skipped" };
}
