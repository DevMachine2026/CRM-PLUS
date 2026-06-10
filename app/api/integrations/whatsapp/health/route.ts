/**
 * GET — saúde Evolution GO + sessão WhatsApp do tenant autenticado.
 */

import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import {
  checkEvolutionServiceHealth,
  checkTenantWhatsAppHealth,
  verifyEvolutionApiKeyAlignment,
} from "@/lib/integrations/evolution-health";
import { isEvolutionEnabled } from "@/lib/integrations/evolution-config";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "integrations")) return forbidden();
  if (!isEvolutionEnabled()) {
    return NextResponse.json(
      { error: "Evolution desativado. Configure WhatsApp via Z-API." },
      { status: 410 },
    );
  }

  const [service, tenant, apiKeyAligned] = await Promise.all([
    checkEvolutionServiceHealth(),
    checkTenantWhatsAppHealth(session.tenantId),
    verifyEvolutionApiKeyAlignment(),
  ]);

  return NextResponse.json({
    data: {
      service,
      tenant,
      apiKeyAligned,
      checkedAt: new Date().toISOString(),
    },
  });
}
