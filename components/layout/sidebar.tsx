"use client";

import { Bot, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useTenantBranding } from "@/components/tenant/tenant-branding-provider";

const SIDEBAR_NAV_ID = "dashboard-sidebar-nav";

type SidebarProps = {
  className?: string;
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
};

export function Sidebar({
  className,
  mobile = false,
  open = true,
  onClose,
  onNavigate,
}: SidebarProps) {
  const { branding, tenantName } = useTenantBranding();

  const handleNavigate = () => {
    onNavigate?.();
    onClose?.();
  };

  return (
    <aside
      className={cn(
        "flex h-full w-56 max-w-[85vw] flex-col border-r border-border/60 bg-background",
        mobile &&
          "fixed inset-y-0 left-0 z-50 shadow-2xl transition-transform duration-300 ease-in-out",
        mobile && (open ? "translate-x-0" : "-translate-x-full pointer-events-none"),
        className
      )}
      aria-hidden={mobile && !open ? true : undefined}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt=""
              className="h-8 max-w-[120px] shrink-0 object-contain object-left"
            />
          ) : (
            <Bot className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          )}
          <span className="truncate text-base font-semibold tracking-tight">
            {tenantName}
          </span>
        </div>
        {mobile && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <SidebarNav
        id={mobile ? SIDEBAR_NAV_ID : undefined}
        onNavigate={mobile ? handleNavigate : onNavigate}
      />

      <div className="shrink-0 border-t border-border/50 p-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-green-500"
            aria-hidden
          />
          <span className="text-xs text-muted-foreground">IA ativa</span>
        </div>
      </div>
    </aside>
  );
}

export { SIDEBAR_NAV_ID };
