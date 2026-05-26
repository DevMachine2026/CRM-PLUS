/**
 * GET — callback OAuth Meta após login no Facebook.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  exchangeCodeForToken,
  exchangeLongLivedUserToken,
  fetchInstagramLinkedPages,
  parseOAuthState,
  setPendingInstagramPages,
} from "@/lib/integrations/meta-oauth";

const INTEGRATIONS_PATH = "/settings/integrations";

function redirectWithError(message: string): NextResponse {
  return NextResponse.redirect(
    `${INTEGRATIONS_PATH}?ig_error=${encodeURIComponent(message)}`,
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const msg =
      errorDescription?.trim() ||
      (error === "access_denied"
        ? "Login cancelado. Autorize o acesso às páginas para continuar."
        : `Erro do Facebook: ${error}`);
    return redirectWithError(msg);
  }

  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const oauthState = parseOAuthState(stateRaw);

  if (!code || !oauthState) {
    return redirectWithError("Sessão OAuth inválida ou expirada. Tente novamente.");
  }

  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.tenantId) {
    return redirectWithError("Faça login no CRM antes de conectar o Instagram.");
  }

  if (user.tenantId !== oauthState.tenantId || user.id !== oauthState.userId) {
    return redirectWithError("Conta logada não corresponde à sessão OAuth.");
  }

  try {
    const shortToken = await exchangeCodeForToken(code);
    const userToken = await exchangeLongLivedUserToken(shortToken);
    const pages = await fetchInstagramLinkedPages(userToken);

    if (pages.length === 0) {
      return redirectWithError(
        "Nenhuma página com Instagram Business encontrada. Vincule uma conta Instagram profissional a uma Página do Facebook.",
      );
    }

    await setPendingInstagramPages(user.tenantId, user.id, pages);

    return NextResponse.redirect(`${INTEGRATIONS_PATH}?ig_oauth=1`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao conectar com Facebook.";
    return redirectWithError(msg);
  }
}
