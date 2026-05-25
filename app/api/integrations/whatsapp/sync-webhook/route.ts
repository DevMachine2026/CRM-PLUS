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

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "integrations")) return forbidden();

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

  return NextResponse.json({ ok: true, webhookUrl });
}
