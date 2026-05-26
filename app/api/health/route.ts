import { NextResponse } from "next/server";
import { checkEvolutionServiceHealth } from "@/lib/integrations/evolution-health";
import { isEvolutionConfigured } from "@/lib/integrations/evolution-config";

export async function GET() {
  const payload: Record<string, unknown> = { status: "ok" };

  if (isEvolutionConfigured()) {
    const evo = await checkEvolutionServiceHealth();
    payload.evolution = {
      configured: evo.configured,
      apiReachable: evo.apiReachable,
      circuit: evo.circuit.state,
    };
  }

  return NextResponse.json(payload);
}
