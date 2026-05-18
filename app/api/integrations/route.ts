/**
 * GET  /api/integrations          — lista integrações do tenant
 * PUT  /api/integrations          — salva/atualiza credenciais de um canal
 * DELETE /api/integrations        — remove uma integração por canal
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "integrations")) return forbidden();

  const integrations = await prisma.integration.findMany({
    where:   { tenantId: session.tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id:          true,
      channelType: true,
      name:        true,
      isActive:    true,
      webhookUrl:  true,
      createdAt:   true,
      updatedAt:   true,
      // credentials is omitted — never send raw secrets to the client
      // we expose only which keys are present (non-empty)
      credentials: true,
    },
  });

  // Mask credential values: return only key names that are set
  const masked = integrations.map((i) => ({
    id:          i.id,
    channelType: i.channelType,
    name:        i.name,
    isActive:    i.isActive,
    webhookUrl:  i.webhookUrl,
    createdAt:   i.createdAt.toISOString(),
    updatedAt:   i.updatedAt.toISOString(),
    // which keys are configured (non-empty string)
    configuredKeys: Object.entries(i.credentials as Record<string, string>)
      .filter(([, v]) => v && v.length > 0)
      .map(([k]) => k),
  }));

  return NextResponse.json({ data: masked });
}

// ── PUT ──────────────────────────────────────────────────────────────────────

const putSchema = z.object({
  channelType: z.enum(["whatsapp", "instagram"]),
  name:        z.string().min(1).max(100).default("Principal"),
  isActive:    z.boolean().optional(),
  credentials: z.record(z.string(), z.string()), // { phoneNumberId, accessToken, verifyToken, ... }
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "integrations")) return forbidden();

  const body   = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });

  const { channelType, name, isActive, credentials } = parsed.data;

  // Upsert by (tenantId, channelType, name)
  const integration = await prisma.integration.upsert({
    where: {
      tenantId_channelType_name: {
        tenantId:    session.tenantId,
        channelType: channelType as "whatsapp" | "instagram",
        name,
      },
    },
    update: {
      credentials: credentials as Record<string, string>,
      ...(isActive !== undefined ? { isActive } : {}),
    },
    create: {
      tenantId:    session.tenantId,
      channelType: channelType as "whatsapp" | "instagram",
      name,
      credentials: credentials as Record<string, string>,
      isActive:    isActive ?? true,
    },
    select: { id: true, channelType: true, name: true, isActive: true, updatedAt: true },
  });

  return NextResponse.json({ data: integration });
}

// ── DELETE ───────────────────────────────────────────────────────────────────

const deleteSchema = z.object({
  channelType: z.enum(["whatsapp", "instagram"]),
  name:        z.string().min(1).default("Principal"),
});

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "delete", "integrations")) return forbidden();

  const body   = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { channelType, name } = parsed.data;

  await prisma.integration.deleteMany({
    where: {
      tenantId:    session.tenantId,
      channelType: channelType as "whatsapp" | "instagram",
      name,
    },
  });

  return NextResponse.json({ ok: true });
}
