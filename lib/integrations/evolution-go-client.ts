/**
 * Cliente Evolution GO (https://github.com/EvolutionAPI/evolution-go)
 *
 * Requer EVOLUTION_API_URL + EVOLUTION_API_KEY (GLOBAL_API_KEY no servidor GO).
 * Sem URL → modo simulado (dev/demo).
 */

import { randomUUID } from "node:crypto";
import { webhookPathForChannel } from "@/lib/integrations/provision-integration";

const BASE = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
const API_KEY = process.env.EVOLUTION_API_KEY ?? "";

export type EvolutionGoSession = {
  instanceName: string;
  instanceId?: string;
  state: "disconnected" | "connecting" | "open" | "close";
  qrCodeBase64?: string;
  pairingCode?: string;
  phoneNumber?: string;
};

export function isEvolutionGoSimulated(): boolean {
  return !BASE;
}

/** Admin routes (/instance/create) usam GLOBAL_API_KEY; demais usam token da instância. */
function adminHeaders(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (API_KEY) h.apikey = API_KEY;
  return h;
}

function instanceHeaders(instanceToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    apikey: instanceToken,
  };
}

/** Nome estável da instância por tenant (idempotente). */
export function evolutionInstanceName(tenantId: string): string {
  return `crmplus-${tenantId.replace(/-/g, "").slice(0, 20)}`;
}

export function resolveCrmWebhookUrl(): string | null {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  return base ? `${base}${webhookPathForChannel("whatsapp", "evolution")}` : null;
}

function jidToPhone(jid: string | undefined): string | undefined {
  if (!jid) return undefined;
  const digits = jid.replace(/@.*/, "").replace(/\D/g, "");
  return digits || undefined;
}

type GoEnvelope<T> = {
  data?: T;
  message?: string;
  success?: boolean;
};

type CreateInstanceData = {
  id?: string;
  name?: string;
  token?: string;
  connected?: boolean;
  jid?: string;
};

type QrData = {
  Qrcode?: string;
  qrcode?: string;
  Code?: string;
  code?: string;
};

type StatusData = {
  Connected?: boolean;
  LoggedIn?: boolean;
  Name?: string;
};

async function parseJson<T>(res: Response): Promise<GoEnvelope<T>> {
  return (await res.json()) as GoEnvelope<T>;
}

/** Cria instância GO ou reutiliza UUID existente. */
export async function createGoInstance(
  instanceName: string,
  existing?: { instanceId?: string; instanceToken?: string },
): Promise<{ instanceId: string; instanceToken: string }> {
  if (existing?.instanceId && existing.instanceToken) {
    return { instanceId: existing.instanceId, instanceToken: existing.instanceToken };
  }

  const instanceToken = randomUUID();
  const res = await fetch(`${BASE}/instance/create`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      name: instanceName,
      token: instanceToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution GO create failed: ${err}`);
  }

  const json = await parseJson<CreateInstanceData>(res);
  const row = json.data;
  const instanceId = row?.id;
  if (!instanceId) throw new Error("Evolution GO create: missing instance id");

  return { instanceId, instanceToken: row?.token ?? instanceToken };
}

/** Conecta instância e registra webhook do CRM na mesma chamada. */
export async function connectGoInstance(
  instanceToken: string,
  webhookUrl: string | null,
): Promise<void> {
  const body: Record<string, unknown> = {
    immediate: true,
    subscribe: ["MESSAGE", "QRCODE", "CONNECTION"],
  };
  if (webhookUrl) body.webhookUrl = webhookUrl;

  const res = await fetch(`${BASE}/instance/connect`, {
    method: "POST",
    headers: instanceHeaders(instanceToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution GO connect failed: ${err}`);
  }
}

export async function fetchGoQrCode(instanceToken: string): Promise<{
  qrCodeBase64?: string;
  pairingCode?: string;
}> {
  const res = await fetch(`${BASE}/instance/qr`, {
    method: "GET",
    headers: instanceHeaders(instanceToken),
  });

  if (!res.ok) return {};

  const json = await parseJson<QrData>(res);
  const row = json.data;
  const raw = row?.Qrcode ?? row?.qrcode;
  const qrCodeBase64 =
    raw?.startsWith("data:") ? raw : raw ? `data:image/png;base64,${raw}` : undefined;
  const pairingCode = row?.Code ?? row?.code;

  return { qrCodeBase64, pairingCode };
}

export async function getGoConnectionState(
  instanceToken: string,
  instanceId?: string,
): Promise<EvolutionGoSession> {
  const res = await fetch(`${BASE}/instance/status`, {
    method: "GET",
    headers: instanceHeaders(instanceToken),
  });

  if (!res.ok) {
    return { instanceName: "", instanceId, state: "disconnected" };
  }

  const json = await parseJson<StatusData>(res);
  const row = json.data;
  const open = row?.Connected === true || row?.LoggedIn === true;

  return {
    instanceName: "",
    instanceId,
    state: open ? "open" : "connecting",
    phoneNumber: row?.Name ? jidToPhone(row.Name) : undefined,
  };
}

/**
 * Fluxo completo: create → connect (webhook) → QR.
 */
export async function startGoWhatsAppSession(params: {
  instanceName: string;
  instanceId?: string;
  instanceToken?: string;
  webhookUrl?: string | null;
}): Promise<EvolutionGoSession & { instanceId: string; instanceToken: string }> {
  if (isEvolutionGoSimulated()) {
    const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect fill="#fff" width="256" height="256"/><text x="128" y="120" text-anchor="middle" font-family="system-ui" font-size="12" fill="#111">CRM PLUS — Demo QR (GO)</text><text x="128" y="140" text-anchor="middle" font-family="system-ui" font-size="10" fill="#666">${params.instanceName}</text></svg>`;
    const base64 = Buffer.from(qrSvg).toString("base64");
    return {
      instanceName: params.instanceName,
      instanceId: params.instanceId ?? `sim-${params.instanceName}`,
      state: "connecting",
      qrCodeBase64: `data:image/svg+xml;base64,${base64}`,
    };
  }

  const webhookUrl = params.webhookUrl ?? resolveCrmWebhookUrl();
  const { instanceId, instanceToken } = await createGoInstance(params.instanceName, {
    instanceId: params.instanceId,
    instanceToken: params.instanceToken,
  });

  await connectGoInstance(instanceToken, webhookUrl);
  const qr = await fetchGoQrCode(instanceToken);

  return {
    instanceName: params.instanceName,
    instanceId,
    instanceToken,
    state: "connecting",
    qrCodeBase64: qr.qrCodeBase64,
    pairingCode: qr.pairingCode,
  };
}

export async function refreshGoQrCode(instanceToken: string): Promise<string | null> {
  if (isEvolutionGoSimulated()) return null;
  const qr = await fetchGoQrCode(instanceToken);
  return qr.qrCodeBase64 ?? null;
}

export { jidToPhone };
