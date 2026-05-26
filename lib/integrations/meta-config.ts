/**
 * Configuração do app Meta (Facebook Login) para Instagram Messaging.
 */

const GRAPH_VERSION = "v21.0";

export function getMetaGraphVersion(): string {
  return GRAPH_VERSION;
}

export function getMetaGraphBase(): string {
  return `https://graph.facebook.com/${GRAPH_VERSION}`;
}

export function getMetaAppId(): string | null {
  const id = process.env.META_APP_ID?.trim();
  return id || null;
}

export function getMetaAppSecret(): string | null {
  const secret = process.env.META_APP_SECRET?.trim();
  return secret || null;
}

export function isMetaOAuthConfigured(): boolean {
  return Boolean(getMetaAppId() && getMetaAppSecret());
}

export function getMetaOAuthRedirectUri(): string | null {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!base) return null;
  return `${base}/api/integrations/instagram/oauth/callback`;
}

/** Permissões para listar páginas e gerenciar DMs do Instagram vinculado. */
export const META_INSTAGRAM_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_messaging",
  "instagram_basic",
  "instagram_manage_messages",
].join(",");
