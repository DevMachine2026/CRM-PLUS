/**
 * GET /api/cron/evolution-health — reconcilia estado WhatsApp + ping Evolution GO.
 * Protegido: Authorization: Bearer <CRON_SECRET> (Vercel Cron).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runEvolutionHealthCron } from "@/lib/integrations/evolution-health";
import { evolutionLog } from "@/lib/integrations/evolution-logger";
import { isEvolutionEnabled } from "@/lib/integrations/evolution-config";

export async function GET(req: NextRequest) {
  if (!isEvolutionEnabled()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "evolution_disabled" });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runEvolutionHealthCron();
    evolutionLog.info("health-cron", "concluído", {
      tenants: result.tenants.length,
      apiReachable: result.service.apiReachable,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    evolutionLog.error("health-cron", "falha", {
      message: err instanceof Error ? err.message : "error",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
