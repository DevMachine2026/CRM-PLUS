/**
 * GET  — lista páginas (OAuth pendente ou demo).
 * POST — conecta página escolhida à integração do tenant.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { provisionIntegration } from "@/lib/integrations/provision-integration";
import {
  clearPendingInstagramPages,
  DEMO_INSTAGRAM_PAGES,
  isDemoPageId,
  isMetaOAuthConfigured,
  readPendingInstagramPages,
  resolvePageAccessToken,
  subscribePageToApp,
  toPublicPageList,
} from "@/lib/integrations/meta-oauth";

const bodySchema = z.object({
  pageId: z.string().min(1),
  pageName: z.string().min(1),
  accessToken: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "integrations")) return forbidden();

  const oauthConfigured = isMetaOAuthConfigured();
  const pending = await readPendingInstagramPages(session.tenantId, session.id);

  if (pending && pending.length > 0) {
    return NextResponse.json({
      data: {
        mode: "oauth" as const,
        oauthConfigured: true,
        pages: toPublicPageList(pending),
      },
    });
  }

  if (!oauthConfigured) {
    return NextResponse.json({
      data: {
        mode: "demo" as const,
        oauthConfigured: false,
        pages: DEMO_INSTAGRAM_PAGES,
      },
    });
  }

  return NextResponse.json({
    data: {
      mode: "oauth" as const,
      oauthConfigured: true,
      pages: [],
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "integrations")) return forbidden();

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { pageId, pageName, accessToken: bodyToken } = parsed.data;

  const pendingPage = await resolvePageAccessToken(
    session.tenantId,
    session.id,
    pageId,
  );

  let accessToken = bodyToken?.trim() || pendingPage?.accessToken;
  let instagramAccountId = pendingPage?.instagramAccountId;
  const resolvedName = pendingPage?.pageName ?? pageName;

  if (!accessToken) {
    if (isDemoPageId(pageId) && !isMetaOAuthConfigured()) {
      accessToken = `ig_demo_${crypto
        .createHash("sha256")
        .update(`${session.tenantId}:${pageId}`)
        .digest("hex")
        .slice(0, 32)}`;
    } else {
      return NextResponse.json(
        {
          error:
            "Token da página não encontrado. Faça login com Facebook e selecione a página novamente.",
        },
        { status: 400 },
      );
    }
  }

  if (pendingPage && !accessToken.startsWith("ig_demo_")) {
    await subscribePageToApp(pendingPage.pageId, pendingPage.accessToken);
  }

  const verifyToken = crypto.randomBytes(16).toString("hex");

  const integration = await provisionIntegration({
    tenantId: session.tenantId,
    channelType: "instagram",
    provider: "meta",
    credentials: {
      provider: "meta",
      connectionState: "connected",
      pageId,
      pageName: resolvedName,
      ...(instagramAccountId ? { instagramAccountId } : {}),
      accessToken,
      verifyToken,
    },
    isActive: true,
  });

  await clearPendingInstagramPages();

  return NextResponse.json({
    data: {
      state: "connected",
      pageId,
      pageName: resolvedName,
      integrationId: integration.id,
      webhookUrl: integration.webhookUrl,
    },
  });
}
