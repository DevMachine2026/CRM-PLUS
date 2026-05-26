/**
 * lib/webhooks/resolve-tenant.ts
 *
 * Resolve tenantId a partir de identificadores do payload (phone_number_id,
 * page_id) buscando na tabela integrations.
 *
 * Em produção: NUNCA aceita ?tenantId= da query (evita spoofing cross-tenant).
 * Em dev: ?tenantId=<UUID> permitido para simulação local.
 */

import { prisma } from "@/lib/db/client";

/** Aceita qualquer UUID em dev (seed usa `...0001`, fora do RFC variant). */
const DEV_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function devTenantOverride(queryTenantId: string | null): string | null {
  if (process.env.NODE_ENV === "production") return null;
  if (!queryTenantId) return null;
  if (DEV_UUID_RE.test(queryTenantId)) return queryTenantId;
  return null;
}

async function matchIntegration(
  channelType: "whatsapp" | "instagram",
  match: (creds: Record<string, string>) => boolean
): Promise<string | null> {
  const integrations = await prisma.integration.findMany({
    where: { channelType, isActive: true },
    select: { tenantId: true, credentials: true },
  });

  for (const row of integrations) {
    const creds = row.credentials as Record<string, string>;
    if (match(creds)) return row.tenantId;
  }
  return null;
}

export async function resolveWhatsAppTenant(
  phoneNumberId: string | undefined,
  queryTenantId: string | null
): Promise<string | null> {
  if (phoneNumberId) {
    const tenantId = await matchIntegration("whatsapp", (creds) =>
      creds.phoneNumberId === phoneNumberId ||
      creds.evolutionInstanceName === phoneNumberId ||
      creds.evolutionInstanceId === phoneNumberId
    );
    if (tenantId) return tenantId;
  }
  return devTenantOverride(queryTenantId);
}

export async function resolveInstagramTenant(
  recipientId: string | undefined,
  queryTenantId: string | null
): Promise<string | null> {
  if (recipientId) {
    const tenantId = await matchIntegration("instagram", (creds) =>
      creds.pageId === recipientId ||
      creds.instagramAccountId === recipientId
    );
    if (tenantId) return tenantId;
  }
  return devTenantOverride(queryTenantId);
}
