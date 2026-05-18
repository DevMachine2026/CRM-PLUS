import { prisma } from "@/lib/db/client";
import type { WhatsAppConfig } from "@/lib/channels/whatsapp";
import type { InstagramConfig } from "@/lib/channels/instagram";
import { getChannelFieldKeys } from "./meta-field-help";

function envWhatsApp(): WhatsAppConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return null;
  return { accessToken, phoneNumberId };
}

function envInstagram(): InstagramConfig | null {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const pageId = process.env.INSTAGRAM_PAGE_ID;
  if (!accessToken || !pageId) return null;
  return { accessToken, pageId };
}

function hasAllKeys(
  creds: Record<string, string>,
  keys: string[],
): boolean {
  return keys.every((k) => Boolean(creds[k]?.trim()));
}

/**
 * Credenciais WhatsApp do tenant (integração ativa) com fallback para env global (dev).
 */
export async function loadWhatsAppCredentials(
  tenantId: string,
): Promise<WhatsAppConfig | null> {
  const row = await prisma.integration.findFirst({
    where: {
      tenantId,
      channelType: "whatsapp",
      isActive: true,
    },
    orderBy: { updatedAt: "desc" },
    select: { credentials: true },
  });

  if (row) {
    const creds = row.credentials as Record<string, string>;
    const required = getChannelFieldKeys("whatsapp").filter((k) => k !== "verifyToken");
    if (hasAllKeys(creds, required)) {
      return {
        accessToken: creds.accessToken.trim(),
        phoneNumberId: creds.phoneNumberId.trim(),
      };
    }
  }

  return envWhatsApp();
}

/**
 * Credenciais Instagram do tenant com fallback para env global (dev).
 */
export async function loadInstagramCredentials(
  tenantId: string,
): Promise<InstagramConfig | null> {
  const row = await prisma.integration.findFirst({
    where: {
      tenantId,
      channelType: "instagram",
      isActive: true,
    },
    orderBy: { updatedAt: "desc" },
    select: { credentials: true },
  });

  if (row) {
    const creds = row.credentials as Record<string, string>;
    const required = getChannelFieldKeys("instagram").filter((k) => k !== "verifyToken");
    if (hasAllKeys(creds, required)) {
      return {
        accessToken: creds.accessToken.trim(),
        pageId: creds.pageId.trim(),
      };
    }
  }

  return envInstagram();
}
