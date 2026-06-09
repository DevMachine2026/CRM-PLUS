/**
 * POST — re-registra webhook do CRM na instância Evolution GO (mensagens → inbox).
 * Use após conectar ou se mensagens não aparecem no CRM.
 */

import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { parseWhatsAppCredentials } from "@/lib/integrations/connection-state";
import {
  connectGoInstance,
  isEvolutionGoSimulated,
  resolveCrmWebhookUrl,
} from "@/lib/integrations/evolution-go-client";
import { provisionIntegration } from "@/lib/integrations/provision-integration";
import { isEvolutionEnabled } from "@/lib/integrations/evolution-config";

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "integrations")) return forbidden();
  if (!isEvolutionEnabled()) {
    return NextResponse.json(
      { error: "Evolution desativado. Configure WhatsApp via Z-API." },
      { status: 410 },
    );
  }

  if (isEvolutionGoSimulated()) {
    return NextResponse.json({ ok: true, simulated: true });
  }

  const row = await prisma.integration.findFirst({
    where: { tenantId: session.tenantId, channelType: "whatsapp", name: "Principal" },
    select: { credentials: true },
  });

  const creds = parseWhatsAppCredentials(row?.credentials);
  const token = creds.instanceToken;
  if (!token) {
    return NextResponse.json({ error: "WhatsApp não conectado." }, { status: 400 });
  }

  const webhookUrl = resolveCrmWebhookUrl();
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "NEXTAUTH_URL não configurado no servidor." },
      { status: 500 },
    );
  }

  await connectGoInstance(token, webhookUrl);

  await provisionIntegration({
    tenantId: session.tenantId,
    channelType: "whatsapp",
    provider: "evolution",
    credentials: { webhookSyncedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true, webhookUrl });
}
