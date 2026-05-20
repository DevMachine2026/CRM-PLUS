/**
 * Evolution GO — envio outbound de texto.
 * @see https://docs.evolutionfoundation.com.br/en/evolution-go/send-a-text-message
 */

import { isEvolutionGoSimulated } from "@/lib/integrations/evolution-go-client";

const BASE = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");

export interface GoSendResult {
  externalId: string | null;
  externalStatus: "sent" | "failed" | "simulated";
  deliveryError?: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Envia texto via POST /send/text (apikey = instance token).
 */
export async function sendEvolutionGoTextMessage(
  to: string,
  text: string,
  instanceToken: string,
): Promise<GoSendResult> {
  const number = normalizePhone(to);
  if (!number) {
    return {
      externalId: null,
      externalStatus: "failed",
      deliveryError: "Número de telefone inválido.",
    };
  }

  if (!BASE || isEvolutionGoSimulated() || instanceToken.startsWith("sim-")) {
    return { externalId: `sim-go-${Date.now()}`, externalStatus: "simulated" };
  }

  try {
    const res = await fetch(`${BASE}/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: instanceToken,
      },
      body: JSON.stringify({ number, text }),
    });

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const err = json.error as Record<string, unknown> | undefined;
      const msg =
        (typeof err?.message === "string" && err.message) ||
        (typeof json.message === "string" && json.message) ||
        `HTTP ${res.status}`;
      return { externalId: null, externalStatus: "failed", deliveryError: msg };
    }

    const data = json.data as Record<string, unknown> | undefined;
    const info = data?.Info as Record<string, unknown> | undefined;
    const externalId =
      (typeof json.messageId === "string" ? json.messageId : undefined) ??
      (typeof info?.ID === "string" ? info.ID : undefined) ??
      null;

    return { externalId, externalStatus: "sent" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "network error";
    return { externalId: null, externalStatus: "failed", deliveryError: msg };
  }
}
