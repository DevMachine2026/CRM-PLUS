/**
 * Orquestração de conexão WhatsApp — Evolution GO.
 * Fluxos: QR (escanear) ou pairing (código de 8 dígitos no celular).
 */

import type { GoConnectRequest, GoConnectResult, WhatsAppConnectMethod } from "./types";
import { normalizeWhatsAppPhone } from "./phone";
import {
  connectGoInstance,
  createGoInstance,
  deleteGoInstanceByName,
  fetchGoQrCode,
  getGoConnectionState,
  isEvolutionGoSimulated,
  requestGoPairingCode,
  resolveCrmWebhookUrl,
  resolveGoInstanceByName,
} from "../evolution-go-client";

function simulatedResult(
  instanceName: string,
  method: WhatsAppConnectMethod,
  phone?: string,
): GoConnectResult {
  const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect fill="#fff" width="256" height="256"/><text x="128" y="120" text-anchor="middle" font-family="system-ui" font-size="12" fill="#111">CRM PLUS — Demo</text></svg>`;
  const base64 = Buffer.from(qrSvg).toString("base64");
  return {
    instanceName,
    instanceId: `sim-${instanceName}`,
    instanceToken: `sim-${instanceName}`,
    method,
    qrCodeBase64: method === "qr" ? `data:image/svg+xml;base64,${base64}` : undefined,
    pairingCode: method === "pairing" ? "12345678" : undefined,
    targetPhone: phone,
  };
}

/**
 * Inicia sessão de conexão (create → connect → QR ou código de pareamento).
 */
export async function startWhatsAppConnectSession(
  instanceName: string,
  options: GoConnectRequest = {},
): Promise<GoConnectResult> {
  const method: WhatsAppConnectMethod = options.method ?? "qr";
  const webhookUrl = resolveCrmWebhookUrl();

  if (isEvolutionGoSimulated()) {
    const phone =
      method === "pairing" && options.phone
        ? normalizeWhatsAppPhone(options.phone)
        : undefined;
    return simulatedResult(instanceName, method, phone);
  }

  if (method === "pairing" && !options.phone?.trim()) {
    throw new Error("Informe o número do WhatsApp para gerar o código de pareamento.");
  }

  if (options.reset) {
    await deleteGoInstanceByName(instanceName);
  } else if (method === "qr") {
    const existing = await resolveGoInstanceByName(instanceName);
    if (existing) {
      const prior = await getGoConnectionState(existing.instanceToken, existing.instanceId);
      if (prior.state === "open") {
        await deleteGoInstanceByName(instanceName);
      }
    }
  }

  const targetPhone =
    method === "pairing" ? normalizeWhatsAppPhone(options.phone!) : undefined;

  const { instanceId, instanceToken } = await createGoInstance(instanceName);

  await connectGoInstance(instanceToken, webhookUrl, targetPhone);

  if (method === "pairing" && targetPhone) {
    await sleep(3500);
    const pairingCode = await requestGoPairingCode(instanceToken, targetPhone);
    return {
      instanceName,
      instanceId,
      instanceToken,
      method,
      pairingCode,
      targetPhone,
    };
  }

  const qr = await fetchGoQrCode(instanceToken);
  return {
    instanceName,
    instanceId,
    instanceToken,
    method,
    qrCodeBase64: qr.qrCodeBase64,
    pairingCode: qr.pairingCode,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
