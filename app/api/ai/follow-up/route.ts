import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateFollowUps } from "@/lib/ai/actions/follow-up";
import { prisma } from "@/lib/db/client";

// GET /api/ai/follow-up — chamado pelo Vercel Cron Job (hourly)
// Protegido por Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      where:  { status: "active" },
      select: { id: true, slug: true },
    });

    const summary: { tenant: string; followUps: number }[] = [];

    for (const tenant of tenants) {
      const results = await generateFollowUps(tenant.id);
      summary.push({ tenant: tenant.slug, followUps: results.length });
    }

    return NextResponse.json({
      ok:        true,
      processed: summary,
      total:     summary.reduce((acc, s) => acc + s.followUps, 0),
    });
  } catch (err) {
    console.error("[follow-up cron]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
