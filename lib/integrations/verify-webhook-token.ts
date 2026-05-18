import { prisma } from "@/lib/db/client";

type WebhookChannel = "whatsapp" | "instagram";

const ENV_VERIFY: Record<WebhookChannel, string | undefined> = {
  whatsapp:  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  instagram: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
};

/**
 * Valida hub.verify_token do Meta:
 * 1) token global em .env (legado / single-tenant dev)
 * 2) verifyToken salvo em qualquer integração ativa do canal
 * 3) dev sem tokens configurados → aceita qualquer (simulação local)
 */
export async function isValidWebhookVerifyToken(
  channel: WebhookChannel,
  receivedToken: string | null,
): Promise<boolean> {
  if (!receivedToken) return false;

  const envToken = ENV_VERIFY[channel];
  if (envToken && receivedToken === envToken) return true;

  const integrations = await prisma.integration.findMany({
    where: { channelType: channel, isActive: true },
    select: { credentials: true },
  });

  for (const row of integrations) {
    const creds = row.credentials as Record<string, string>;
    const stored = creds.verifyToken?.trim();
    if (stored && stored === receivedToken) return true;
  }

  if (process.env.NODE_ENV !== "production") {
    const anyConfigured =
      Boolean(envToken) ||
      integrations.some((i) => {
        const v = (i.credentials as Record<string, string>).verifyToken?.trim();
        return Boolean(v);
      });
    if (!anyConfigured) return true;
  }

  return false;
}
