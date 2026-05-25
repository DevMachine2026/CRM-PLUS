/**
 * GET — PNG do QR Code direto do Evolution GO (sem JSON/base64 no cliente).
 * O WhatsApp só aceita o QR oficial gerado pelo Evolution (campo `code`), não recriações.
 */

import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { parseWhatsAppCredentials } from "@/lib/integrations/connection-state";
import { extractNativeGoQrPng } from "@/lib/integrations/evolution-go/qr-image";
import { renderWhatsAppQrPngFromRow } from "@/lib/integrations/evolution-go/qr-render";
import {
  fetchNativeGoQrPngWithRetry,
  isEvolutionGoSimulated,
  resolveGoLiveConnection,
} from "@/lib/integrations/evolution-go-client";

const SIMULATED = isEvolutionGoSimulated();

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "read", "integrations")) return forbidden();

  const row = await prisma.integration.findFirst({
    where: { tenantId: session.tenantId, channelType: "whatsapp", name: "Principal" },
    select: { credentials: true },
  });

  const creds = parseWhatsAppCredentials(row?.credentials);
  const token = creds.instanceToken;

  if (SIMULATED) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect fill="#fff" width="320" height="320"/><text x="160" y="160" text-anchor="middle" font-family="system-ui" font-size="14">CRM PLUS Demo</text></svg>`;
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  if (!token) {
    return NextResponse.json({ error: "Sessão WhatsApp não iniciada." }, { status: 404 });
  }

  const evo = await resolveGoLiveConnection(token, creds.evolutionInstanceId);
  if (evo.state === "open") {
    return NextResponse.json({ error: "WhatsApp já conectado." }, { status: 409 });
  }

  const hard = new URL(req.url).searchParams.get("hard") === "1";
  let png = await fetchNativeGoQrPngWithRetry(token, {
    attempts: hard ? 12 : 6,
    delayMs: hard ? 2000 : 1200,
  });

  if (!png && creds.lastQrCodeBase64) {
    const cached = { code: creds.lastQrCodeBase64, qrcode: creds.lastQrCodeBase64 };
    png = extractNativeGoQrPng(cached);
    if (!png) png = await renderWhatsAppQrPngFromRow(cached);
  }

  if (!png) {
    return NextResponse.json(
      {
        error:
          "QR Code ainda não disponível. Aguarde 2–3 segundos e toque em Atualizar QR.",
      },
      { status: 503 },
    );
  }

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}
