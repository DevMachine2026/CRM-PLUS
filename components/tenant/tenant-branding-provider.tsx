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
    const prev: Record<string, string> = {};

    for (const [key, value] of Object.entries(vars)) {
      prev[key] = root.style.getPropertyValue(key);
      root.style.setProperty(key, value);
    }

    return () => {
      for (const key of Object.keys(vars)) {
        if (prev[key]) root.style.setProperty(key, prev[key]);
        else root.style.removeProperty(key);
      }
    };
  }, [branding.primaryColor]);

  const displayName =
    branding.displayName?.trim() || tenantName || "CRM PLUS";

  return (
    <BrandingContext.Provider value={{ branding, tenantName: displayName }}>
      {children}
    </BrandingContext.Provider>
  );
}
