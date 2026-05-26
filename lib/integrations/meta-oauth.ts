/**
 * OAuth Meta (Facebook Login) → páginas com Instagram Business vinculado.
 */

import { cookies } from "next/headers";
import {
  getMetaAppId,
  getMetaAppSecret,
  getMetaGraphBase,
  getMetaOAuthRedirectUri,
  isMetaOAuthConfigured,
  META_INSTAGRAM_OAUTH_SCOPES,
} from "@/lib/integrations/meta-config";
import { encodeSignedPayload, decodeSignedPayload } from "@/lib/integrations/signed-payload";

const OAUTH_DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";
const PENDING_COOKIE = "ig_meta_oauth_pending";
const PENDING_MAX_AGE_SEC = 15 * 60;

export type MetaOAuthState = {
  tenantId: string;
  userId: string;
  exp: number;
};

export type MetaInstagramPage = {
  pageId: string;
  pageName: string;
  accessToken: string;
  instagramAccountId: string;
  instagramUsername?: string;
};

type PendingPagesPayload = {
  tenantId: string;
  userId: string;
  exp: number;
  pages: MetaInstagramPage[];
};

export type MetaPageListItem = {
  id: string;
  name: string;
  instagramUsername?: string;
};

/** Páginas fixas quando META_APP_ID não está configurado (dev/demo). */
export const DEMO_INSTAGRAM_PAGES: MetaPageListItem[] = [
  { id: "demo-page-1", name: "Concessionária Centro — Instagram" },
  { id: "demo-page-2", name: "Loja Premium Motors" },
];

export function buildMetaOAuthUrl(state: MetaOAuthState): string | null {
  const appId = getMetaAppId();
  const redirectUri = getMetaOAuthRedirectUri();
  if (!appId || !redirectUri) return null;

  const stateToken = encodeSignedPayload(state);
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state: stateToken,
    scope: META_INSTAGRAM_OAUTH_SCOPES,
    response_type: "code",
  });

  return `${OAUTH_DIALOG}?${params.toString()}`;
}

export function parseOAuthState(token: string | null): MetaOAuthState | null {
  if (!token) return null;
  const data = decodeSignedPayload<MetaOAuthState>(token);
  if (!data?.tenantId || !data.userId || !data.exp) return null;
  if (Date.now() > data.exp) return null;
  return data;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const appId = getMetaAppId();
  const secret = getMetaAppSecret();
  const redirectUri = getMetaOAuthRedirectUri();
  if (!appId || !secret || !redirectUri) {
    throw new Error("App Meta não configurado.");
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: secret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${getMetaGraphBase()}/oauth/access_token?${params}`);
  const json = (await res.json()) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? "Falha ao obter token do Facebook.");
  }

  return json.access_token;
}

/** Converte token de curta duração em longa duração (~60 dias). */
export async function exchangeLongLivedUserToken(shortToken: string): Promise<string> {
  const appId = getMetaAppId();
  const secret = getMetaAppSecret();
  if (!appId || !secret) return shortToken;

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: secret,
    fb_exchange_token: shortToken,
  });

  const res = await fetch(`${getMetaGraphBase()}/oauth/access_token?${params}`);
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? shortToken;
}

export async function fetchInstagramLinkedPages(
  userAccessToken: string,
): Promise<MetaInstagramPage[]> {
  const fields =
    "id,name,access_token,instagram_business_account{id,username}";
  const url = `${getMetaGraphBase()}/me/accounts?fields=${encodeURIComponent(fields)}&limit=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });
  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token?: string;
      instagram_business_account?: { id: string; username?: string };
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? "Não foi possível listar páginas do Facebook.");
  }

  const pages: MetaInstagramPage[] = [];
  for (const row of json.data ?? []) {
    const ig = row.instagram_business_account;
    if (!ig?.id || !row.access_token) continue;
    pages.push({
      pageId: row.id,
      pageName: ig.username
        ? `${row.name} (@${ig.username})`
        : row.name,
      accessToken: row.access_token,
      instagramAccountId: ig.id,
      instagramUsername: ig.username,
    });
  }

  return pages;
}

export async function subscribePageToApp(
  pageId: string,
  pageAccessToken: string,
): Promise<void> {
  const url = `${getMetaGraphBase()}/${pageId}/subscribed_apps`;
  const body = new URLSearchParams({
    subscribed_fields: "messages,messaging_postbacks,message_reactions",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${pageAccessToken}` },
    body,
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    console.warn(
      "[meta-oauth] subscribed_apps falhou:",
      json.error?.message ?? res.status,
    );
  }
}

export async function setPendingInstagramPages(
  tenantId: string,
  userId: string,
  pages: MetaInstagramPage[],
): Promise<void> {
  const payload: PendingPagesPayload = {
    tenantId,
    userId,
    exp: Date.now() + PENDING_MAX_AGE_SEC * 1000,
    pages,
  };
  const token = encodeSignedPayload(payload);
  const jar = await cookies();
  jar.set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_MAX_AGE_SEC,
  });
}

export async function clearPendingInstagramPages(): Promise<void> {
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
}

export async function readPendingInstagramPages(
  tenantId: string,
  userId: string,
): Promise<MetaInstagramPage[] | null> {
  const jar = await cookies();
  const raw = jar.get(PENDING_COOKIE)?.value;
  if (!raw) return null;

  const data = decodeSignedPayload<PendingPagesPayload>(raw);
  if (!data?.pages || !data.exp) return null;
  if (data.tenantId !== tenantId || data.userId !== userId) return null;
  if (Date.now() > data.exp) return null;

  return data.pages;
}

export async function resolvePageAccessToken(
  tenantId: string,
  userId: string,
  pageId: string,
): Promise<MetaInstagramPage | null> {
  const pages = await readPendingInstagramPages(tenantId, userId);
  return pages?.find((p) => p.pageId === pageId) ?? null;
}

export function toPublicPageList(pages: MetaInstagramPage[]): MetaPageListItem[] {
  return pages.map((p) => ({
    id: p.pageId,
    name: p.pageName,
    instagramUsername: p.instagramUsername,
  }));
}

export function isDemoPageId(pageId: string): boolean {
  return DEMO_INSTAGRAM_PAGES.some((p) => p.id === pageId);
}

export { isMetaOAuthConfigured };
