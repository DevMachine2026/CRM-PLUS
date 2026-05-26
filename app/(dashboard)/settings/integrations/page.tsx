import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { parseTenantAiSettings } from "@/lib/ai/tenant-settings";
import {
  parseInstagramCredentials,
  parseWhatsAppCredentials,
  whatsappUiState,
  instagramUiState,
} from "@/lib/integrations/connection-state";
import { checkTenantWhatsAppHealth } from "@/lib/integrations/evolution-health";
import { isEvolutionConfigured } from "@/lib/integrations/evolution-config";
import { IntegrationsHubClient } from "./integrations-hub-client";
import { IntegrationsClient, type IntegrationData } from "./integrations-client";

export const metadata = { title: "Integrações — CRM PLUS" };

type PageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function IntegrationsPage({ searchParams }: PageProps) {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "integrations", "/settings?reason=forbidden");

  const { mode } = await searchParams;
  const tenantId = session.tenantId;
  const canEdit = can(session.role, "update", "integrations");

  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const [integrations, tenant] = await Promise.all([
    prisma.integration.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        channelType: true,
        name: true,
        isActive: true,
        webhookUrl: true,
        credentials: true,
        updatedAt: true,
      },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    }),
  ]);

  if (mode === "advanced") {
    const masked: IntegrationData[] = integrations.map((i) => ({
      id: i.id,
      channelType: i.channelType as "whatsapp" | "instagram",
      name: i.name,
      isActive: i.isActive,
      webhookUrl: i.webhookUrl,
      updatedAt: i.updatedAt.toISOString(),
      configuredKeys: Object.entries(i.credentials as Record<string, string>)
        .filter(([, v]) => v && String(v).length > 0)
        .map(([k]) => k),
    }));

    return (
      <IntegrationsClient
        baseUrl={baseUrl}
        initialIntegrations={masked}
        canEdit={canEdit}
      />
    );
  }

  const waRow = integrations.find((i) => i.channelType === "whatsapp");
  const igRow = integrations.find((i) => i.channelType === "instagram");
  const waCreds = parseWhatsAppCredentials(waRow?.credentials);
  const igCreds = parseInstagramCredentials(igRow?.credentials);

  let waState = whatsappUiState(waCreds);
  if (isEvolutionConfigured() && waCreds.provider === "evolution") {
    const live = await checkTenantWhatsAppHealth(tenantId);
    if (live?.uiState) waState = live.uiState;
  }
  const igState = instagramUiState(igCreds);

  return (
    <IntegrationsHubClient
      canEdit={canEdit}
      aiSettings={parseTenantAiSettings(tenant?.settings)}
      whatsapp={{
        state: waState,
        subtitle:
          waState === "connected" && waCreds.phoneNumber
            ? `+${waCreds.phoneNumber.replace(/\D/g, "")}`
            : undefined,
        webhookUrl: waRow?.webhookUrl,
      }}
      instagram={{
        state: igState,
        subtitle: igCreds.pageName ?? (igCreds.pageId ? `Página ${igCreds.pageId}` : undefined),
        webhookUrl: igRow?.webhookUrl,
      }}
    />
  );
}
