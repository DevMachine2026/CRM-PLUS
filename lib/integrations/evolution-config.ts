/**
 * Configuração central Evolution GO ↔ CRM (sem expor valores em logs).
 */

export function getEvolutionApiUrl(): string | undefined {
  return process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
}

export function getEvolutionApiKey(): string {
  return process.env.EVOLUTION_API_KEY?.trim() ?? "";
}

/** Segredo opcional para validar webhooks (query ?token= ou header x-evolution-webhook-token). */
export function getEvolutionWebhookSecret(): string {
  return (
    process.env.EVOLUTION_WEBHOOK_SECRET?.trim() ??
    process.env.EVOLUTION_WEBHOOK_TOKEN?.trim() ??
    ""
  );
}

export function isEvolutionConfigured(): boolean {
  return Boolean(getEvolutionApiUrl());
}

/** Em produção com GO configurado, webhooks devem ser autenticados. */
export function isEvolutionWebhookAuthRequired(): boolean {
  if (process.env.EVOLUTION_WEBHOOK_AUTH_REQUIRED === "false") return false;
  if (process.env.NODE_ENV !== "production") {
    return process.env.EVOLUTION_WEBHOOK_AUTH_REQUIRED === "true";
  }
  return isEvolutionConfigured() && Boolean(getEvolutionApiKey() || getEvolutionWebhookSecret());
}

export function buildEvolutionWebhookUrl(basePath = "/api/webhooks/evolution"): string | null {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!base) return null;

  const secret = getEvolutionWebhookSecret();
  const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (!secret) return `${base}${path}`;
  return `${base}${path}?token=${encodeURIComponent(secret)}`;
}
