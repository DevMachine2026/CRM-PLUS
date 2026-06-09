import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import {
  getEvolutionApiKey,
  getEvolutionWebhookSecret,
  isEvolutionWebhookAuthRequired,
} from "@/lib/integrations/evolution-config";
import { evolutionLog } from "@/lib/integrations/evolution-logger";

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function headerApiKey(req: NextRequest): string | null {
  return (
    req.headers.get("apikey") ??
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null
  );
}

export type EvolutionWebhookAuthResult =
  | { ok: true; method: "apikey" | "webhook_secret" | "instance_token" | "dev_skip" }
  | { ok: false; reason: string };

/**
 * Autentica webhooks Evolution → CRM:
 * 1) apikey = EVOLUTION_API_KEY (GLOBAL_API_KEY no Render)
 * 2) ?token= ou x-evolution-webhook-token = EVOLUTION_WEBHOOK_SECRET
 * 3) instanceToken no payload = token salvo na integração (após resolver tenant)
 */
export function verifyEvolutionWebhookRequest(
  req: NextRequest,
  options?: {
    instanceTokenFromPayload?: string;
    storedInstanceToken?: string;
    /** Instância já resolvida no banco (Evolution GO costuma omitir instanceToken no POST). */
    instanceResolved?: boolean;
  },
): EvolutionWebhookAuthResult {
  const globalKey = getEvolutionApiKey();
  const webhookSecret = getEvolutionWebhookSecret();
  const incomingKey = headerApiKey(req);
  const queryToken = req.nextUrl.searchParams.get("token");
  const headerWebhookToken = req.headers.get("x-evolution-webhook-token");

  if (globalKey && incomingKey && safeEqual(incomingKey, globalKey)) {
    return { ok: true, method: "apikey" };
  }

  if (webhookSecret) {
    const fromQuery = queryToken && safeEqual(queryToken, webhookSecret);
    const fromHeader = headerWebhookToken && safeEqual(headerWebhookToken, webhookSecret);
    if (fromQuery || fromHeader) {
      return { ok: true, method: "webhook_secret" };
    }
  }

  const payloadToken = options?.instanceTokenFromPayload?.trim();
  const stored = options?.storedInstanceToken?.trim();
  if (payloadToken && stored && safeEqual(payloadToken, stored)) {
    return { ok: true, method: "instance_token" };
  }

  if (options?.instanceResolved && stored) {
    return { ok: true, method: "instance_token" };
  }

  if (!isEvolutionWebhookAuthRequired()) {
    return { ok: true, method: "dev_skip" };
  }

  const reason = globalKey
    ? "apikey ou webhook secret inválidos"
    : "EVOLUTION_API_KEY ou EVOLUTION_WEBHOOK_SECRET não configurados";
  evolutionLog.warn("webhook-auth", "rejeitado", { reason });
  return { ok: false, reason };
}
