import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import {
  tenantAiSettingsSchema,
  TONE_LABELS,
  type TenantAiSettings,
} from "@/lib/ai/tenant-settings";
import { buildTenantSystemPrompt } from "@/lib/ai/tenant-prompt";

function buildSimulatedReply(settings: TenantAiSettings): string {
  const tone = settings.agentTone
    ? TONE_LABELS[settings.agentTone]
    : "Profissional";
  const persona = buildTenantSystemPrompt(
    settings,
    "Responda em uma frase de boas-vindas a um lead que acabou de entrar em contato.",
  );

  return (
    `Olá! Sou ${settings.agentName} (tom ${tone}). ` +
    `Recebi sua mensagem e posso ajudar com informações sobre nossos produtos e próximos passos no funil.\n\n` +
    `[Simulação alinhada ao prompt do tenant — nenhuma mensagem real foi enviada.]\n\n` +
    `---\nPrévia do system prompt:\n${persona.slice(0, 280)}…`
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
