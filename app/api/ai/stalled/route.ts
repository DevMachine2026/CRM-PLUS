import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { detectStalledLeads } from "@/lib/ai/actions/detect-stalled-leads";
import { prisma } from "@/lib/db/client";

// GET /api/ai/stalled — detect stalled leads and auto-create tasks
// Cron path: Authorization: Bearer <CRON_SECRET> → runs for all tenants
// User path: valid session → runs for the authenticated tenant
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  // Cron path: CRON_SECRET in Authorization header
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const tenants = await prisma.tenant.findMany({
      where:  { status: "active" },
      select: { id: true, slug: true },
    });
    const summary: { tenant: string; stalled: number; tasksCreated: number }[] = [];
    for (const tenant of tenants) {
      const results = await detectStalledLeads(tenant.id);
      summary.push({
        tenant:       tenant.slug,
        stalled:      results.length,
        tasksCreated: results.filter((r) => r.taskCreated).length,
      });
    }
    return NextResponse.json({ ok: true, processed: summary });
  }

  // User path: session auth
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "opportunities")) return forbidden();
  const stalled = await detectStalledLeads(session.tenantId, session.id);
  return NextResponse.json({
    data: stalled,
    meta: {
      total:        stalled.length,
      tasksCreated: stalled.filter((s) => s.taskCreated).length,
    },
  });
}

// POST /api/ai/stalled — chamado pelo Vercel Cron Job (daily 8h)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    where:  { status: "active" },
    select: { id: true, slug: true },
  });

  const summary: { tenant: string; stalled: number; tasksCreated: number }[] = [];

  for (const tenant of tenants) {
    const results = await detectStalledLeads(tenant.id);
    summary.push({
      tenant:       tenant.slug,
      stalled:      results.length,
      tasksCreated: results.filter((r) => r.taskCreated).length,
    });
  }

  return NextResponse.json({ ok: true, processed: summary });
}
