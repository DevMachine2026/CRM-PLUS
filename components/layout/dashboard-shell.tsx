"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar, SIDEBAR_NAV_ID } from "@/components/layout/sidebar";
import { ds } from "@/lib/design-system";

type DashboardShellProps = {
  topbar: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardShell({
  topbar,
  banner,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(
    () => setMobileOpen((prev) => !prev),
    []
  );

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen, closeMobile]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <Sidebar className="hidden h-full shrink-0 md:flex" />

      {mobileOpen && (
        <div className="md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Fechar menu de navegação"
            className="fixed inset-0 z-[45] bg-black/60"
            onClick={closeMobile}
          />
          <Sidebar mobile open onClose={closeMobile} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "sticky top-0 z-30 flex shrink-0 items-center gap-3",
            ds.headerHeight,
            "border-b border-border/60 bg-background/85 px-4 backdrop-blur-md",
            "supports-[backdrop-filter]:bg-background/75",
            "md:static md:z-auto md:bg-background md:backdrop-blur-none"
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("shrink-0 md:hidden", ds.touchTarget)}
            onClick={toggleMobile}
            aria-expanded={mobileOpen}
            aria-controls={SIDEBAR_NAV_ID}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center justify-end">
            {topbar}
          </div>
        </header>
        {banner}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className={cn(
              "mx-auto w-full max-w-7xl",
              ds.pagePx,
              ds.pagePy,
              ds.pagePbFab
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
