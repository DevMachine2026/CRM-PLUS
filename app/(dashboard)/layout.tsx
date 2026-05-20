import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/Topbar";
import { AuthAlertBanner } from "@/components/auth-alert-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      topbar={<Topbar />}
      banner={<AuthAlertBanner />}
    >
      {children}
    </DashboardShell>
  );
}
