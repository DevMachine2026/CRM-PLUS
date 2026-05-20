/**
 * Ingestão de webhooks com log + processamento assíncrono leve (fire-and-forget na mesma request,
 * com registro em webhook_logs para auditoria e retry manual).
 */

import { prisma } from "@/lib/db/client";
import type { ConversationChannel } from "@/lib/generated/prisma/enums";

export async function ingestWebhook<T>(params: {
  tenantId: string;
  integrationId?: string;
  channel: ConversationChannel;
  payload: unknown;
  process: () => Promise<T>;
}): Promise<T> {
  const log = await prisma.webhookLog.create({
    data: {
      tenantId: params.tenantId,
      integrationId: params.integrationId ?? null,
      channel: params.channel,
      payload: params.payload as object,
      status: "received",
    },
  });

  try {
    const result = await params.process();
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: "processed", processedAt: new Date() },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "processing error";
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: "failed", error: message, processedAt: new Date() },
    });
    throw err;
  }
}

/** Enfileira processamento sem bloquear a resposta HTTP (best-effort). */
export function enqueueWebhookProcessing(
  fn: () => Promise<void>,
): void {
  void fn().catch((err) => {
    console.error("[webhook-queue]", err);
  });
}
