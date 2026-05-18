import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { can } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "./integrations-client";

export const metadata = { title: "Integrações — CRM PLUS" };

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!can(session.user.role, "read", "integrations")) redirect("/settings");

  const tenantId  = session.user.tenantId;
  const canEdit   = can(session.user.role, "update", "integrations");

  // Resolve base URL — Vercel sets VERCEL_URL, fallback to NEXTAUTH_URL then localhost
  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const integrations = await prisma.integration.findMany({
    where:   { tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id:          true,
      channelType: true,
      name:        true,
      isActive:    true,
      webhookUrl:  true,
      credentials: true,
      updatedAt:   true,
    },
  });

  const masked = integrations.map((i) => ({
    id:          i.id,
    channelType: i.channelType as "whatsapp" | "instagram",
    name:        i.name,
    isActive:    i.isActive,
    webhookUrl:  i.webhookUrl,
    updatedAt:   i.updatedAt.toISOString(),
    configuredKeys: Object.entries(i.credentials as Record<string, string>)
      .filter(([, v]) => v && v.length > 0)
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
