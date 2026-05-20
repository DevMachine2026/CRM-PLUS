/**
 * POST — simula / completa login social Instagram (Graph API).
 * Body: { pageId, pageName, accessToken? }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { provisionIntegration } from "@/lib/integrations/provision-integration";
import crypto from "crypto";

const bodySchema = z.object({
  pageId:       z.string().min(1),
  pageName:     z.string().min(1),
  accessToken:  z.string().optional(),
});

/** Páginas demo quando cliente não passa token real. */
const DEMO_PAGES = [
  { id: "demo-page-1", name: "Concessionária Centro — Instagram" },
  { id: "demo-page-2", name: "Loja Premium Motors" },
];

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "integrations")) return forbidden();

  return NextResponse.json({ data: { pages: DEMO_PAGES } });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "integrations")) return forbidden();

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { pageId, pageName, accessToken } = parsed.data;
  const token =
    accessToken?.trim() ||
    `ig_demo_${crypto.createHash("sha256").update(`${session.tenantId}:${pageId}`).digest("hex").slice(0, 32)}`;

  const verifyToken = crypto.randomBytes(16).toString("hex");

  const integration = await provisionIntegration({
    tenantId: session.tenantId,
    channelType: "instagram",
    provider: "meta",
    credentials: {
      provider: "meta",
      connectionState: "connected",
      pageId,
      pageName,
      accessToken: token,
      verifyToken,
    },
    isActive: true,
  });

  return NextResponse.json({
    data: {
      state: "connected",
      pageId,
      pageName,
      integrationId: integration.id,
      webhookUrl: integration.webhookUrl,
    },
  });
}
