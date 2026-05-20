/**
 * Provisiona / atualiza integração de canal de forma idempotente:
 * credenciais mescladas, webhookUrl assinado no registro, tenant isolado.
 */

import { prisma } from "@/lib/db/client";
import type { IntegrationChannel } from "./meta-field-help";

function resolvePublicBaseUrl(): string | null {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  );
}

export function webhookPathForChannel(
  channel: IntegrationChannel,
  provider?: "meta" | "evolution",
): string {
  if (channel === "whatsapp" && provider === "evolution") {
    return "/api/webhooks/evolution";
  }
  return `/api/webhooks/${channel}`;
}

export async function provisionIntegration(params: {
  tenantId: string;
  channelType: IntegrationChannel;
  name?: string;
  credentials: Record<string, string>;
  isActive?: boolean;
  provider?: "meta" | "evolution";
}) {
  const name = params.name ?? "Principal";
  const baseUrl = resolvePublicBaseUrl();
  const webhookPath = webhookPathForChannel(params.channelType, params.provider);
  const webhookUrl = baseUrl ? `${baseUrl}${webhookPath}` : null;

  const existing = await prisma.integration.findUnique({
    where: {
      tenantId_channelType_name: {
        tenantId: params.tenantId,
        channelType: params.channelType,
        name,
      },
    },
    select: { id: true, credentials: true },
  });

  const prev = (existing?.credentials ?? {}) as Record<string, string>;
  const merged: Record<string, string> = { ...prev };
  for (const [k, v] of Object.entries(params.credentials)) {
    if (v !== undefined && v !== null) merged[k] = String(v).trim();
  }

  return prisma.integration.upsert({
    where: {
      tenantId_channelType_name: {
        tenantId: params.tenantId,
        channelType: params.channelType,
        name,
      },
    },
    update: {
      credentials: merged,
      ...(webhookUrl ? { webhookUrl } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    },
    create: {
      tenantId:    params.tenantId,
      channelType: params.channelType,
      name,
      credentials: merged,
      webhookUrl:  webhookUrl,
      isActive:    params.isActive ?? true,
    },
    select: {
      id: true,
      channelType: true,
      name: true,
      isActive: true,
      webhookUrl: true,
      credentials: true,
      updatedAt: true,
    },
  });
}
