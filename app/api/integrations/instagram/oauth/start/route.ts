/**
 * GET — inicia OAuth Meta (Facebook Login) para Instagram.
 */

import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import {
  buildMetaOAuthUrl,
  isMetaOAuthConfigured,
} from "@/lib/integrations/meta-oauth";
import { getMetaOAuthRedirectUri } from "@/lib/integrations/meta-config";

const INTEGRATIONS_PATH = "/settings/integrations";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "integrations")) return forbidden();

  if (!isMetaOAuthConfigured()) {
    return NextResponse.redirect(
      `${INTEGRATIONS_PATH}?ig_error=${encodeURIComponent("Configure META_APP_ID e META_APP_SECRET no servidor.")}`,
    );
  }

  const redirectUri = getMetaOAuthRedirectUri();
  if (!redirectUri) {
    return NextResponse.redirect(
      `${INTEGRATIONS_PATH}?ig_error=${encodeURIComponent("Defina NEXTAUTH_URL com a URL pública do CRM.")}`,
    );
  }

  const state = {
    tenantId: session.tenantId,
    userId: session.id,
    exp: Date.now() + 10 * 60 * 1000,
  };

  const url = buildMetaOAuthUrl(state);
  if (!url) {
    return NextResponse.redirect(
      `${INTEGRATIONS_PATH}?ig_error=${encodeURIComponent("Não foi possível iniciar o login com Facebook.")}`,
    );
  }

  return NextResponse.redirect(url);
}
