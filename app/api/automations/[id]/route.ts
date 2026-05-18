import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
  trigger: z.object({
    type: z.enum([
      "contact_created",
      "contact_status_changed",
      "opportunity_created",
      "opportunity_status_changed",
      "opportunity_stage_changed",
      "task_created",
      "revenue_status_changed",
      "conversation_created",
    ]),
  }).optional(),
  conditions: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "contains", "not_contains", "is_empty", "is_not_empty"]),
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })).max(10).optional(),
  actions: z.array(z.any()).min(1).max(10).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/automations/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "automations")) return forbidden();

  const { id } = await params;

  const automation = await prisma.automation.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          status: true,
          error: true,
          actionsRun: true,
          createdAt: true,
        },
      },
    },
  });

  if (!automation) {
    return NextResponse.json({ error: "Automação não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ data: automation });
}

// PATCH /api/automations/[id]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "automations")) return forbidden();

  const { id } = await params;

  const existing = await prisma.automation.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Automação não encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, isActive, trigger, conditions, actions } = parsed.data;

  const updated = await prisma.automation.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(trigger !== undefined ? { trigger } : {}),
      ...(conditions !== undefined ? { conditions } : {}),
      ...(actions !== undefined ? { actions } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}

// DELETE /api/automations/[id]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "delete", "automations")) return forbidden();

  const { id } = await params;

  const existing = await prisma.automation.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Automação não encontrada." }, { status: 404 });
  }

  await prisma.automation.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
