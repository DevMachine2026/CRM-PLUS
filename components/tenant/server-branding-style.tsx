import {
  brandingStyleTag,
  brandingToCssVars,
  type TenantBranding,
} from "@/lib/tenant/branding-settings";

/** Injeta tema no HTML antes do paint (evita flash de cor padrão). */
export function ServerBrandingStyle({ branding }: { branding: TenantBranding }) {
  const css = brandingStyleTag(brandingToCssVars(branding.primaryColor));
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
