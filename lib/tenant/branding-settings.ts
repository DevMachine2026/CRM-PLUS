import { z } from "zod";
import { brandMix, isDefaultBrandColor } from "./brand-colors";

const MAX_LOGO_DATA_URL_LENGTH = 600_000;

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const tenantBrandingSchema = z.object({
  logoUrl: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .max(MAX_LOGO_DATA_URL_LENGTH)
      .optional()
      .refine(
        (v) =>
          !v ||
          /^https?:\/\/.+/i.test(v) ||
          v.startsWith("data:image/"),
        "Logo: use URL https ou envie arquivo PNG/JPG/WebP.",
      ),
  ),
  primaryColor: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Use cor em formato #RRGGBB (ex: #2563eb).")
      .optional(),
  ),
  displayName: z.preprocess(
    emptyToUndefined,
    z.string().min(1).max(80).optional(),
  ),
});

/** Normaliza payload do formulário antes de gravar/ler. */
export function normalizeTenantBranding(input: unknown): TenantBranding {
  const parsed = tenantBrandingSchema.safeParse(input);
  if (!parsed.success) {
    return { ...DEFAULT_BRANDING };
  }
  return {
    logoUrl: parsed.data.logoUrl ?? "",
    primaryColor: parsed.data.primaryColor ?? DEFAULT_BRANDING.primaryColor!,
    displayName: parsed.data.displayName ?? "",
  };
}

/** Mescla branding novo com o existente no JSON do tenant. */
export function mergeTenantBranding(
  currentSettings: unknown,
  patch: unknown,
): TenantBranding {
  const base = parseTenantBranding(currentSettings);
  const raw = patch && typeof patch === "object" ? patch : {};
  return normalizeTenantBranding({ ...base, ...raw });
}

export type TenantBranding = z.infer<typeof tenantBrandingSchema>;

export const BRAND_COLOR_PRESETS = [
  { label: "Preto", value: "#171717" },
  { label: "Azul", value: "#2563eb" },
  { label: "Verde", value: "#059669" },
  { label: "Roxo", value: "#7c3aed" },
  { label: "Laranja", value: "#ea580c" },
  { label: "Vermelho", value: "#dc2626" },
] as const;

export const DEFAULT_BRANDING: TenantBranding = {
  logoUrl: "",
  primaryColor: "#171717",
  displayName: "",
};

export function parseTenantBranding(settings: unknown): TenantBranding {
  if (!settings || typeof settings !== "object") return { ...DEFAULT_BRANDING };
  const raw = (settings as Record<string, unknown>).branding;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_BRANDING };
  return normalizeTenantBranding(raw);
}

function contrastForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#171717" : "#fafafa";
}

/**
 * Tokens de marca aplicados no :root — botões, menu ativo, ícones, focus, gráficos.
 * Usa color-mix para tons sutis (fundo de nav, accent) sem “pintar” a UI inteira.
 */
export function brandingToCssVars(color: string | undefined): Record<string, string> {
  if (!color?.startsWith("#") || color.length !== 7) return {};
  if (isDefaultBrandColor(color)) return {};

  const fg = contrastForeground(color);
  return {
    "--primary": color,
    "--primary-foreground": fg,
    "--ring": brandMix(color, 40, "transparent"),
    "--accent": brandMix(color, 11, "var(--background)"),
    "--accent-foreground": color,
    "--sidebar-primary": color,
    "--sidebar-primary-foreground": fg,
    "--sidebar-accent": brandMix(color, 14, "transparent"),
    "--sidebar-accent-foreground": color,
    "--sidebar-ring": brandMix(color, 30, "transparent"),
    "--brand-subtle": brandMix(color, 13, "transparent"),
    "--brand-muted": brandMix(color, 7, "var(--background)"),
    "--brand-border": brandMix(color, 22, "transparent"),
    "--chart-1": color,
  };
}

export { isDefaultBrandColor };

export function brandingStyleTag(cssVars: Record<string, string>): string {
  const body = Object.entries(cssVars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return body ? `:root{${body}}` : "";
}
