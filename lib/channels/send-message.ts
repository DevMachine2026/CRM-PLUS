import { sendWhatsAppMessage } from "./whatsapp";
import { sendInstagramMessage } from "./instagram";
import { sendEvolutionGoTextMessage } from "./evolution-go-send";
import {
  loadInstagramCredentials,
  resolveWhatsAppSendRoute,
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

    const route = await resolveWhatsAppSendRoute(tenantId);

    if (!route) {
      return sendWhatsAppMessage(payload.recipientPhone, content, null);
    }
    if (route.kind === "unavailable") {
      return {
        externalId: null,
        externalStatus: "failed",
        deliveryError: route.reason,
      };
    }
    if (route.kind === "evolution-go") {
      return sendEvolutionGoTextMessage(
        payload.recipientPhone,
        content,
        route.instanceToken,
        { tenantId, integrationId: route.integrationId },
      );
    }
    if (route.kind === "simulated") {
      return { externalId: `sim-${Date.now()}`, externalStatus: "simulated" };
    }

    return sendWhatsAppMessage(payload.recipientPhone, content, {
      accessToken: route.accessToken,
      phoneNumberId: route.phoneNumberId,
    });
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
