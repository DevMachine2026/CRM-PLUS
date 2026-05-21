"use client";

import { createContext, useContext, useEffect } from "react";
import {
  brandingToCssVars,
  type TenantBranding,
  DEFAULT_BRANDING,
} from "@/lib/tenant/branding-settings";

type BrandingContextValue = {
  branding: TenantBranding;
  tenantName: string;
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  tenantName: "CRM PLUS",
});

export function useTenantBranding() {
  return useContext(BrandingContext);
}

export function TenantBrandingProvider({
  branding,
  tenantName,
  children,
}: {
  branding: TenantBranding;
  tenantName: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const vars = brandingToCssVars(branding.primaryColor);
    const hasBrand = Object.keys(vars).length > 0;
    root.toggleAttribute("data-branded", hasBrand);
    if (!hasBrand) {
      for (const key of [
        "--primary",
        "--primary-foreground",
        "--ring",
        "--accent",
        "--accent-foreground",
        "--sidebar-primary",
        "--sidebar-primary-foreground",
        "--sidebar-accent",
        "--sidebar-accent-foreground",
        "--sidebar-ring",
        "--brand-subtle",
        "--brand-muted",
        "--brand-border",
        "--chart-1",
      ]) {
        root.style.removeProperty(key);
      }
      return;
    }
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
  }, [branding.primaryColor]);

  const displayName =
    branding.displayName?.trim() || tenantName || "CRM PLUS";

  return (
    <BrandingContext.Provider value={{ branding, tenantName: displayName }}>
      {children}
    </BrandingContext.Provider>
  );
}
