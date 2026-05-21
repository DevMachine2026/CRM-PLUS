import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/Topbar";
import { AuthAlertBanner } from "@/components/auth-alert-banner";
import { TenantBrandingProvider } from "@/components/tenant/tenant-branding-provider";
import { ServerBrandingStyle } from "@/components/tenant/server-branding-style";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { parseTenantBranding } from "@/lib/tenant/branding-settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  let branding = parseTenantBranding(null);
  let tenantName = "CRM PLUS";

  if (session?.user?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true, settings: true },
    });
    if (tenant) {
      tenantName = tenant.name;
      branding = parseTenantBranding(tenant.settings);
    }
  }

  return (
    <TenantBrandingProvider branding={branding} tenantName={tenantName}>
      <ServerBrandingStyle branding={branding} />
      <DashboardShell topbar={<Topbar />} banner={<AuthAlertBanner />}>
        {children}
      </DashboardShell>
    </TenantBrandingProvider>
  );
}
