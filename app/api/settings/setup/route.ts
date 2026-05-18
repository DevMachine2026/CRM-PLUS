/**
 * POST /api/settings/setup
 *
 * Provisiona pipeline padrão, tags e automações para o tenant autenticado.
 * Útil para tenants criados antes do auto-setup (e.g., seed de desenvolvimento).
 * É idempotente: não duplica dados existentes.
 *
 * Requer: role owner | manager
 */

import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden} from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { setupNewTenant } from "@/lib/tenant/setup";

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "settings")) return forbidden();

  try {
    await setupNewTenant(session.tenantId);
    return NextResponse.json({ ok: true, message: "Provisionamento concluído." });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings/setup] error:", message);
    return NextResponse.json({ error: "Erro ao provisionar.", detail: message }, { status: 500 });
  }
}
