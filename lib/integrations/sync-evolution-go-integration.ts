/**
 * Atualiza integração WhatsApp a partir de eventos Evolution GO (webhook).
 */

import { prisma } from "@/lib/db/client";
import { provisionIntegration } from "@/lib/integrations/provision-integration";
import type { EvolutionGoWebhookEvent } from "@/lib/webhooks/parse-evolution-go-payload";

export async function syncIntegrationFromGoEvent(
  tenantId: string,
  event: EvolutionGoWebhookEvent,
): Promise<void> {
  if (event.kind === "qrcode" && event.qrCodeBase64) {
    await provisionIntegration({
      tenantId,
      channelType: "whatsapp",
      provider: "evolution",
      credentials: {
        provider: "evolution",
        evolutionApiVersion: "go",
        evolutionInstanceId: event.instanceId ?? "",
        connectionState: "awaiting_scan",
        lastQrAt: new Date().toISOString(),
        lastQrCodeBase64: event.qrCodeBase64,
        ...(event.instanceToken ? { instanceToken: event.instanceToken } : {}),
      },
    });
    return;
  }

  if (event.kind === "connected") {
    const phone = event.phoneNumber?.replace(/\D/g, "") ?? "";
    if (phone.length < 10) return;

    await provisionIntegration({
      tenantId,
      channelType: "whatsapp",
      provider: "evolution",
      credentials: {
        provider: "evolution",
        evolutionApiVersion: "go",
        evolutionInstanceId: event.instanceId ?? "",
        connectionState: "connected",
        phoneNumber: phone,
        targetPhone: "",
        ...(event.instanceToken ? { instanceToken: event.instanceToken } : {}),
      },
      isActive: true,
    });
  }
}

export async function findTenantByEvolutionInstance(
  instanceId?: string,
  instanceName?: string,
): Promise<{ tenantId: string; integrationId: string } | null> {
  if (!instanceId && !instanceName) return null;

  const rows = await prisma.integration.findMany({
    where: { channelType: "whatsapp", isActive: true },
    select: { id: true, tenantId: true, credentials: true },
  });

  for (const row of rows) {
    const creds = row.credentials as Record<string, string>;
    if (instanceId && creds.evolutionInstanceId === instanceId) {
      return { tenantId: row.tenantId, integrationId: row.id };
    }
    if (instanceName && creds.evolutionInstanceName === instanceName) {
      return { tenantId: row.tenantId, integrationId: row.id };
    }
    // Legado v2: instance name em phoneNumberId
    if (instanceName && creds.phoneNumberId === instanceName) {
      return { tenantId: row.tenantId, integrationId: row.id };
    }
  }

  return null;
}
