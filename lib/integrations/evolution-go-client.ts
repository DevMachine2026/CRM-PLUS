/**
 * Cliente Evolution GO (https://github.com/EvolutionAPI/evolution-go)
 *
 * Requer EVOLUTION_API_URL + EVOLUTION_API_KEY (GLOBAL_API_KEY no servidor GO).
 * Sem URL → modo simulado (dev/demo).
 */

import { randomUUID } from "node:crypto";
import {
  buildEvolutionWebhookUrl,
  getEvolutionApiKey,
  getEvolutionApiUrl,
  isEvolutionEnabled,
} from "@/lib/integrations/evolution-config";
import { fetchEvolutionGo } from "@/lib/integrations/http-resilience";
import { evolutionLog } from "@/lib/integrations/evolution-logger";
import { phoneFromWhatsAppJid } from "@/lib/integrations/evolution-go/phone";
import {
  extractNativeGoQrPng,
  nativeGoQrPngToDataUrl,
  normalizeGoQrRow,
} from "@/lib/integrations/evolution-go/qr-image";
import { renderWhatsAppQrPngFromRow } from "@/lib/integrations/evolution-go/qr-render";

const BASE = getEvolutionApiUrl();
const API_KEY = getEvolutionApiKey();

export type EvolutionGoSession = {
  instanceName: string;
  instanceId?: string;
  state: "disconnected" | "connecting" | "open" | "close";
  qrCodeBase64?: string;
  pairingCode?: string;
  phoneNumber?: string;
};

export function isEvolutionGoSimulated(): boolean {
  return !isEvolutionEnabled() || !BASE;
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
  return buildEvolutionWebhookUrl();
}

async function goFetch(url: string, init: RequestInit, label: string): Promise<Response> {
  return fetchEvolutionGo(url, init, { label, attempts: 3, timeoutMs: 25_000 });
}

function jidToPhone(jid: string | undefined): string | undefined {
  return phoneFromWhatsAppJid(jid);
}

type StatusDataRaw = {
  Connected?: boolean;
  LoggedIn?: boolean;
  connected?: boolean;
  loggedIn?: boolean;
  Name?: string;
  name?: string;
  myJid?: string;
  MyJid?: string;
  jid?: string;
  Jid?: string;
};

function normalizeGoStatusRow(raw: StatusData | undefined): StatusData {
  if (!raw) return {};
  const r = raw as StatusDataRaw;
  return {
    Connected: r.Connected ?? r.connected,
    LoggedIn: r.LoggedIn ?? r.loggedIn,
    Name: r.Name ?? r.name,
    myJid: r.myJid ?? r.MyJid ?? r.jid ?? r.Jid,
  };
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
  pairingCode?: string;
  PairingCode?: string;
};

type StatusData = {
  Connected?: boolean;
  LoggedIn?: boolean;
  Name?: string;
  myJid?: string;
};

/** WhatsApp autenticado (sessão no aparelho), não só socket aguardando QR. */
export function isGoWhatsAppSessionOpen(row: StatusData | undefined): boolean {
  const status = normalizeGoStatusRow(row);
  const phone = phoneFromWhatsAppJid(status.myJid);
  if (!phone) return false;
  return status.LoggedIn === true;
}

type GoInstanceListRow = GoInstanceRow & {
  jid?: string;
  Jid?: string;
  connected?: boolean;
  Connected?: boolean;
  loggedIn?: boolean;
  LoggedIn?: boolean;
};

async function fetchGoInstanceListRow(instanceId: string): Promise<GoInstanceListRow | null> {
  if (!BASE) return null;
  const res = await goFetch(`${BASE}/instance/all`, { headers: adminHeaders() }, "instance/all");
  if (!res.ok) return null;
  const json = await parseJson<GoInstanceListRow[]>(res);
  const rows = Array.isArray(json.data) ? json.data : [];
  return rows.find((r) => r.id === instanceId) ?? null;
}

/** Status ao vivo: /instance/status + fallback em /instance/all (jid da instância). */
export async function resolveGoLiveConnection(
  instanceToken: string,
  instanceId?: string,
): Promise<EvolutionGoSession> {
  const res = await goFetch(
    `${BASE}/instance/status`,
    { method: "GET", headers: instanceHeaders(instanceToken) },
    "instance/status",
  );

  if (!res.ok) {
    if (instanceId) {
      const listRow = await fetchGoInstanceListRow(instanceId);
      const phone = phoneFromWhatsAppJid(listRow?.jid ?? listRow?.Jid);
      const loggedIn = listRow?.loggedIn === true || listRow?.LoggedIn === true;
      if (phone && loggedIn) {
        return { instanceName: "", instanceId, state: "open", phoneNumber: phone };
      }
    }
    return { instanceName: "", instanceId, state: "disconnected" };
  }

  const json = await parseJson<StatusData>(res);
  const row = normalizeGoStatusRow(json.data);
  let phoneNumber = phoneFromWhatsAppJid(row.myJid);

  if (isGoWhatsAppSessionOpen(row) && phoneNumber) {
    return { instanceName: "", instanceId, state: "open", phoneNumber };
  }

  if (instanceId) {
    const listRow = await fetchGoInstanceListRow(instanceId);
    phoneNumber = phoneFromWhatsAppJid(listRow?.jid ?? listRow?.Jid);
    const loggedIn = listRow?.loggedIn === true || listRow?.LoggedIn === true;
    if (phoneNumber && loggedIn) {
      return { instanceName: "", instanceId, state: "open", phoneNumber };
    }
  }

  return { instanceName: "", instanceId, state: "connecting" };
}

async function parseJson<T>(res: Response): Promise<GoEnvelope<T>> {
  return (await res.json()) as GoEnvelope<T>;
}

type GoInstanceRow = { id?: string; name?: string; token?: string };

export async function resolveGoInstanceByName(
  instanceName: string,
): Promise<{ instanceId: string; instanceToken: string } | null> {
  const res = await goFetch(`${BASE}/instance/all`, { headers: adminHeaders() }, "instance/all");
  if (!res.ok) return null;

  const json = await parseJson<GoInstanceRow[]>(res);
  const rows = Array.isArray(json.data) ? json.data : [];
  const row = rows.find((r) => r.name === instanceName);
  if (!row?.id || !row?.token) return null;
  return { instanceId: row.id, instanceToken: row.token };
}

/** Cria instância GO (ou reaproveita a que já existe com o mesmo nome). */
export async function createGoInstance(
  instanceName: string,
): Promise<{ instanceId: string; instanceToken: string }> {
  const instanceToken = randomUUID();
  const res = await goFetch(
    `${BASE}/instance/create`,
    {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ name: instanceName, token: instanceToken }),
    },
    "instance/create",
  );

  if (!res.ok) {
    const err = await res.text();
    if (err.includes("already exists")) {
      const existing = await resolveGoInstanceByName(instanceName);
      if (existing) return existing;
    }
    throw new Error(`Evolution GO create failed: ${err}`);
  }

  const json = await parseJson<CreateInstanceData>(res);
  const row = json.data;
  const instanceId = row?.id;
  if (!instanceId) throw new Error("Evolution GO create: missing instance id");

  return { instanceId, instanceToken: row?.token ?? instanceToken };
}

/** Remove instância pelo nome (admin) — útil antes de reconectar outro número. */
export async function deleteGoInstanceByName(instanceName: string): Promise<void> {
  if (isEvolutionGoSimulated() || !BASE) return;
  const row = await resolveGoInstanceByName(instanceName);
  if (!row) return;

  const res = await goFetch(
    `${BASE}/instance/delete/${row.instanceId}`,
    { method: "DELETE", headers: adminHeaders() },
    "instance/delete",
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Evolution GO delete failed: ${err}`);
  }
}

/** Conecta instância e registra webhook do CRM na mesma chamada. */
export async function connectGoInstance(
  instanceToken: string,
  webhookUrl: string | null,
  phone?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    immediate: true,
    subscribe: [
      "MESSAGE",
      "messages.upsert",
      "MESSAGES_UPSERT",
      "QRCODE",
      "CONNECTION",
      "connection.update",
    ],
  };
  if (webhookUrl) body.webhookUrl = webhookUrl;
  if (phone) body.phone = phone;

  const res = await goFetch(
    `${BASE}/instance/connect`,
    {
      method: "POST",
      headers: instanceHeaders(instanceToken),
      body: JSON.stringify(body),
    },
    "instance/connect",
  );

  if (!res.ok) {
    const err = await res.text();
    evolutionLog.error("connect", "falha ao registrar webhook", { status: res.status });
    throw new Error(`Evolution GO connect failed: ${err}`);
  }
  evolutionLog.info("connect", "webhook registrado", {
    hasWebhook: Boolean(webhookUrl),
  });
}

export async function fetchGoQrCode(instanceToken: string): Promise<{
  qrCodeBase64?: string;
  pairingCode?: string;
}> {
  const res = await goFetch(
    `${BASE}/instance/qr`,
    { method: "GET", headers: instanceHeaders(instanceToken) },
    "instance/qr",
  );

  if (!res.ok) return {};

  const json = (await res.json()) as unknown;
  const row = normalizeGoQrRow(json);
  const qrCodeBase64 = nativeGoQrPngToDataUrl(row ?? undefined);

  return { qrCodeBase64, pairingCode: undefined };
}

/** QR demora alguns segundos após POST /instance/connect. */
export async function waitForGoQrCode(
  instanceToken: string,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<{ qrCodeBase64?: string; pairingCode?: string }> {
  const attempts = options.attempts ?? 10;
  const delayMs = options.delayMs ?? 1500;

  for (let i = 0; i < attempts; i++) {
    const qr = await fetchGoQrCode(instanceToken);
    if (qr.qrCodeBase64) return qr;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return {};
}

/** PNG/JPEG bruto do Evolution — para rota /api/integrations/whatsapp/qr */
export async function fetchNativeGoQrPng(instanceToken: string): Promise<Buffer | null> {
  if (!BASE) return null;
  const res = await goFetch(
    `${BASE}/instance/qr`,
    { method: "GET", headers: instanceHeaders(instanceToken), cache: "no-store" },
    "instance/qr-png",
  );
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("image/")) {
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length >= 200 ? buf : null;
  }

  try {
    const json = (await res.json()) as unknown;
    const row = normalizeGoQrRow(json);
    const native = extractNativeGoQrPng(row ?? undefined);
    if (native) return native;
    return await renderWhatsAppQrPngFromRow(row ?? undefined);
  } catch {
    return null;
  }
}

/** Tenta buscar QR no Evolution por até ~30s (QR demora após connect). */
export async function fetchNativeGoQrPngWithRetry(
  instanceToken: string,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<Buffer | null> {
  const attempts = options.attempts ?? 15;
  const delayMs = options.delayMs ?? 2000;

  for (let i = 0; i < attempts; i++) {
    const png = await fetchNativeGoQrPng(instanceToken);
    if (png) return png;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Código de 8 dígitos — WhatsApp → Aparelhos conectados → Conectar com número. */
export async function requestGoPairingCode(
  instanceToken: string,
  phone: string,
): Promise<string> {
  const res = await goFetch(
    `${BASE}/instance/pair`,
    {
      method: "POST",
      headers: instanceHeaders(instanceToken),
      body: JSON.stringify({
        phone,
        subscribe: [
          "MESSAGE",
          "messages.upsert",
          "MESSAGES_UPSERT",
          "QRCODE",
          "CONNECTION",
          "connection.update",
        ],
      }),
    },
    "instance/pair",
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution GO pair failed: ${err}`);
  }

  const json = (await res.json()) as {
    data?: { code?: string; pairingCode?: string; PairingCode?: string };
  };
  const row = json.data;
  const code = row?.code ?? row?.pairingCode ?? row?.PairingCode;
  if (!code) throw new Error("Evolution GO pair: código não retornado");
  return code.replace(/\D/g, "").slice(0, 8);
}

export async function getGoConnectionState(
  instanceToken: string,
  instanceId?: string,
): Promise<EvolutionGoSession> {
  if (isEvolutionGoSimulated()) {
    return { instanceName: "", instanceId, state: "connecting" };
  }
  return resolveGoLiveConnection(instanceToken, instanceId);
}

/**
 * @deprecated Prefer `startWhatsAppConnectSession` from `@/lib/integrations/evolution-go/session`.
 * Mantido para compatibilidade — fluxo QR apenas.
 */
export async function startGoWhatsAppSession(params: {
  instanceName: string;
  webhookUrl?: string | null;
}): Promise<EvolutionGoSession & { instanceId: string; instanceToken: string }> {
  const { startWhatsAppConnectSession } = await import("./evolution-go/session");
  const result = await startWhatsAppConnectSession(params.instanceName, {
    method: "qr",
  });
  return {
    instanceName: result.instanceName,
    instanceId: result.instanceId,
    instanceToken: result.instanceToken,
    state: "connecting",
    qrCodeBase64: result.qrCodeBase64,
    pairingCode: result.pairingCode,
  };
}

export async function refreshGoQrCode(instanceToken: string): Promise<string | null> {
  if (isEvolutionGoSimulated()) return null;
  const qr = await fetchGoQrCode(instanceToken);
  return qr.qrCodeBase64 ?? null;
}

export { jidToPhone };
