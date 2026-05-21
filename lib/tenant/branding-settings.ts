import { z } from "zod";

export const tenantBrandingSchema = z.object({
  logoUrl: z
    .string()
    .max(2000)
    .optional()
    .refine((v) => !v || v === "" || /^https?:\/\/.+/i.test(v), "URL da logo inválida."),
  primaryColor:  z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use cor em formato #RRGGBB (ex: #2563eb).")
    .optional(),
  displayName:   z.string().min(1).max(80).optional(),
});

export type TenantBranding = z.infer<typeof tenantBrandingSchema>;

export const DEFAULT_BRANDING: TenantBranding = {
  logoUrl: "",
  primaryColor: "#171717",
  displayName: "",
};

export function parseTenantBranding(settings: unknown): TenantBranding {
  if (!settings || typeof settings !== "object") return { ...DEFAULT_BRANDING };
  const raw = (settings as Record<string, unknown>).branding;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BRANDING };
  const parsed = tenantBrandingSchema.safeParse(raw);
  return parsed.success
    ? { ...DEFAULT_BRANDING, ...parsed.data }
    : { ...DEFAULT_BRANDING };
}

export function brandingToCssVars(color: string | undefined): Record<string, string> {
  if (!color?.startsWith("#")) return {};
  return {
    "--primary": color,
    "--ring": color,
    "--sidebar-primary": color,
  };
}
