import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getSession, unauthorized, forbidden} from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "contains", "not_contains", "is_empty", "is_not_empty"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("send_whatsapp"),
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("send_instagram"),
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("create_task"),
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDays: z.number().int().min(0).max(365).optional(),
  }),
  z.object({
    type: z.literal("update_contact_status"),
    status: z.enum(["lead", "customer", "inactive"]),
  }),
  z.object({
    type: z.literal("add_tag"),
    tagName: z.string().min(1),
  }),
  z.object({
    type: z.literal("create_activity"),
    activityType: z.enum(["call", "meeting", "email", "note", "whatsapp", "instagram"]),
    title: z.string().min(1),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("update_opportunity_stage"),
    stageId: z.string().uuid(),
  }),
]);

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
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
  }),
  conditions: z.array(conditionSchema).max(10).default([]),
  actions: z.array(actionSchema).min(1).max(10),
});

// GET /api/automations
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "automations")) return forbidden();

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 20;

  const [automations, total] = await Promise.all([
    prisma.automation.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        trigger: true,
        conditions: true,
        actions: true,
        runCount: true,
        lastRunAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.automation.count({ where: { tenantId: session.tenantId } }),
  ]);

  return NextResponse.json({
    data: automations,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

// POST /api/automations
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "create", "automations")) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, isActive, trigger, conditions, actions } = parsed.data;

  const automation = await prisma.automation.create({
    data: {
      tenantId: session.tenantId,
      name,
      description: description ?? null,
      isActive: isActive ?? true,
      trigger,
      conditions,
      actions,
    },
  });

  return NextResponse.json({ data: automation }, { status: 201 });
}
