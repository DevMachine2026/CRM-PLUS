/**
 * Registro de eventos de integração (conexão, falhas, health) em ai_logs.
 */

import { prisma } from "@/lib/db/client";

export type IntegrationEventAction =
  | "evolution_connected"
  | "evolution_disconnected"
  | "evolution_qr"
  | "evolution_send_ok"
  | "evolution_send_fail"
  | "evolution_health_ok"
  | "evolution_health_fail"
  | "evolution_webhook_ok"
  | "evolution_webhook_fail";

export async function logIntegrationEvent(params: {
  tenantId: string;
  integrationId?: string;
  action: IntegrationEventAction;
  summary: string;
  detail?: string;
}): Promise<void> {
  try {
    await prisma.aiLog.create({
      data: {
        tenantId: params.tenantId,
        entityType: "integration",
        entityId: params.integrationId ?? params.tenantId,
        action: params.action,
        modelProvider: "system",
        modelId: "evolution-go",
        promptTokens: 0,
        completionTokens: 0,
        inputSummary: params.summary.slice(0, 500),
        outputSummary: (params.detail ?? "").slice(0, 500),
      },
    });
  } catch (err) {
    console.error("[integration-events]", err);
  }
}
