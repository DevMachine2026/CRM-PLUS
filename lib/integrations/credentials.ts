import { prisma } from "@/lib/db/client";
import type { WhatsAppConfig } from "@/lib/channels/whatsapp";
import type { InstagramConfig } from "@/lib/channels/instagram";
import { getChannelFieldKeys } from "./meta-field-help";
import {
  parseWhatsAppCredentials,
  whatsappUiState,
} from "./connection-state";
import { isEvolutionGoSimulated } from "./evolution-go-client";

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

export type WhatsAppSendRoute =
  | { kind: "meta"; accessToken: string; phoneNumberId: string }
  | { kind: "evolution-go"; instanceToken: string }
  | { kind: "simulated" }
  | { kind: "unavailable"; reason: string };

/**
 * Decide como enviar WhatsApp outbound: Evolution GO, Meta Cloud ou simulado.
 */
export async function resolveWhatsAppSendRoute(
  tenantId: string,
): Promise<WhatsAppSendRoute | null> {
  const row = await prisma.integration.findFirst({
    where: { tenantId, channelType: "whatsapp", isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { credentials: true },
  });

  if (row) {
    const creds = parseWhatsAppCredentials(row.credentials);
    const isGo =
      creds.provider === "evolution" || creds.evolutionApiVersion === "go";

    if (isGo) {
      if (whatsappUiState(creds) !== "connected") {
        return {
          kind: "unavailable",
          reason: "WhatsApp não conectado. Escaneie o QR em Integrações.",
        };
      }
      const token = creds.instanceToken?.trim();
      if (isEvolutionGoSimulated() || !token || token.startsWith("sim-")) {
        return { kind: "simulated" };
      }
      return { kind: "evolution-go", instanceToken: token };
    }

    const required = getChannelFieldKeys("whatsapp").filter((k) => k !== "verifyToken");
    const raw = row.credentials as Record<string, string>;
    if (hasAllKeys(raw, required)) {
      return {
        kind: "meta",
        accessToken: raw.accessToken.trim(),
        phoneNumberId: raw.phoneNumberId.trim(),
      };
    }
  }

  const env = envWhatsApp();
  if (env) return { kind: "meta", ...env };
  return null;
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
