import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import {
  tenantAiSettingsSchema,
  TONE_LABELS,
  type TenantAiSettings,
} from "@/lib/ai/tenant-settings";

function buildSimulatedReply(settings: TenantAiSettings): string {
  const tone = settings.agentTone
    ? TONE_LABELS[settings.agentTone]
    : "Profissional";
  const ctx = settings.companyContext?.trim()
    ? `\n\nContexto: ${settings.companyContext.trim()}`
    : "";

  return (
    `Olá! Sou ${settings.agentName}, assistente comercial (tom ${tone}). ` +
    `Recebi sua mensagem e posso ajudar com informações sobre nossos produtos e próximos passos no funil.` +
    ctx +
    `\n\n[Simulação — nenhuma mensagem real foi enviada ao cliente.]`
  );
}

// POST /api/settings/ai/test-prompt — simula resposta do agente sem persistir
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "settings")) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = tenantAiSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Configuração inválida.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await new Promise((r) => setTimeout(r, 600));

  const sampleReply = buildSimulatedReply(parsed.data);

  return NextResponse.json({
    data: {
      preview: `Simulação OK — agente "${parsed.data.agentName}" responderia no tom configurado.`,
      sampleReply,
      agentName: parsed.data.agentName,
    },
  });
}
