/**
 * lib/webhooks/resolve-tenant.ts
 *
 * Resolve tenantId a partir de identificadores do payload (phone_number_id,
 * page_id) buscando na tabela integrations.
 *
 * Fallback para dev/simulação: aceita ?tenantId=<UUID> na query string.
 */

import { prisma } from "@/lib/db/client";

/**
 * Resolve o tenantId para um webhook WhatsApp.
 *
 * Estratégia:
 *  1. Busca integração ativa com credentials.phoneNumberId === phoneNumberId
 *  2. Fallback: ?tenantId=<UUID> na query string (dev / simulação)
 */
export async function resolveWhatsAppTenant(
  phoneNumberId: string | undefined,
  queryTenantId: string | null
): Promise<string | null> {
  if (phoneNumberId) {
    const integration = await prisma.integration.findFirst({
      where: {
        channelType: "whatsapp",
        isActive:    true,
      },
      select: { tenantId: true, credentials: true },
    });

    if (integration) {
      const creds = integration.credentials as Record<string, string>;
      if (creds.phoneNumberId === phoneNumberId) {
        return integration.tenantId;
      }
    }
  }

  // fallback para simulação / dev
  return queryTenantId;
}

/**
 * Resolve o tenantId para um webhook Instagram.
 *
 * Estratégia:
 *  1. Busca integração ativa com credentials.pageId === recipientId
 *  2. Fallback: ?tenantId=<UUID> na query string (dev / simulação)
 */
export async function resolveInstagramTenant(
  recipientId: string | undefined,
  queryTenantId: string | null
): Promise<string | null> {
  if (recipientId) {
    const integration = await prisma.integration.findFirst({
      where: {
        channelType: "instagram",
        isActive:    true,
      },
      select: { tenantId: true, credentials: true },
    });

    if (integration) {
      const creds = integration.credentials as Record<string, string>;
      if (creds.pageId === recipientId) {
        return integration.tenantId;
      }
    }
  }

  return queryTenantId;
}
