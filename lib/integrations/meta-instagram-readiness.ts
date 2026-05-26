/**
 * Checklist de preparação Instagram/Meta (sem expor segredos).
 */

import {
  getMetaAppId,
  getMetaAppSecret,
  getMetaOAuthRedirectUri,
  isMetaOAuthConfigured,
} from "@/lib/integrations/meta-config";

export type ReadinessStatus = "ok" | "missing" | "optional" | "info";

export type MetaReadinessItem = {
  id: string;
  label: string;
  hint: string;
  status: ReadinessStatus;
  /** Valor exibível (URL, ID mascarado) — nunca o secret completo. */
  displayValue?: string;
};

export type MetaInstagramReadiness = {
  mode: "demo" | "ready";
  readyForOAuth: boolean;
  readyForProductionWebhooks: boolean;
  oauthRedirectUri: string;
  webhookUrl: string;
  items: MetaReadinessItem[];
};

function maskId(id: string): string {
  if (id.length <= 8) return "••••••••";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function resolvePublicBase(publicBaseUrl: string): string {
  return (
    publicBaseUrl.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  );
}

function hasInstagramWebhookSecret(): boolean {
  return Boolean(
    process.env.INSTAGRAM_WEBHOOK_SECRET?.trim() ||
      process.env.META_APP_SECRET?.trim() ||
      process.env.WEBHOOK_SECRET?.trim(),
  );
}

export function getMetaInstagramReadiness(
  publicBaseUrl: string,
): MetaInstagramReadiness {
  const base = resolvePublicBase(publicBaseUrl);
  const oauthRedirectUri =
    getMetaOAuthRedirectUri() ??
    (base ? `${base}/api/integrations/instagram/oauth/callback` : "");
  const webhookUrl = base ? `${base}/api/webhooks/instagram` : "";

  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  const webhookSecret = hasInstagramWebhookSecret();
  const signatureRequired = process.env.WEBHOOK_SIGNATURE_REQUIRED === "true";

  const items: MetaReadinessItem[] = [
    {
      id: "meta_app_id",
      label: "META_APP_ID",
      hint: "ID do aplicativo em developers.facebook.com → Configurações → Básico.",
      status: appId ? "ok" : "missing",
      displayValue: appId ? maskId(appId) : undefined,
    },
    {
      id: "meta_app_secret",
      label: "META_APP_SECRET",
      hint: "Chave secreta do mesmo app (só no servidor — .env ou painel Vercel).",
      status: appSecret ? "ok" : "missing",
      displayValue: appSecret ? "configurado" : undefined,
    },
    {
      id: "nextauth_url",
      label: "NEXTAUTH_URL",
      hint: "URL pública do CRM (local: http://localhost:3000; produção: https://seu-dominio).",
      status: nextAuthUrl ? "ok" : "missing",
      displayValue: nextAuthUrl,
    },
    {
      id: "instagram_webhook_secret",
      label: "INSTAGRAM_WEBHOOK_SECRET",
      hint:
        signatureRequired
          ? "Obrigatório em produção com WEBHOOK_SIGNATURE_REQUIRED=true. Pode ser igual ao META_APP_SECRET."
          : "Recomendado em produção (validação HMAC do webhook). Pode ser igual ao META_APP_SECRET.",
      status: webhookSecret ? "ok" : signatureRequired ? "missing" : "optional",
      displayValue: webhookSecret ? "configurado" : undefined,
    },
    {
      id: "oauth_redirect",
      label: "Redirect URI (cadastrar no app Meta)",
      hint: "Facebook Login → Configurações → URIs de redirecionamento OAuth válidos.",
      status: oauthRedirectUri ? "info" : "missing",
      displayValue: oauthRedirectUri || undefined,
    },
    {
      id: "webhook_url",
      label: "Webhook Instagram (cadastrar no app Meta)",
      hint: "Produto Instagram / Messenger → Webhooks → URL de retorno de chamada.",
      status: webhookUrl ? "info" : "missing",
      displayValue: webhookUrl || undefined,
    },
  ];

  const readyForOAuth = isMetaOAuthConfigured() && Boolean(nextAuthUrl);
  const readyForProductionWebhooks =
    readyForOAuth && webhookSecret && Boolean(webhookUrl);

  return {
    mode: readyForOAuth ? "ready" : "demo",
    readyForOAuth,
    readyForProductionWebhooks,
    oauthRedirectUri,
    webhookUrl,
    items,
  };
}
