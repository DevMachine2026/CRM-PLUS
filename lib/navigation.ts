export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  badge?: boolean;
};

/**
 * Active route for sidebar highlighting.
 * - `exact: true` → pathname === href only (Integrações, Configurações).
 * - default → pathname === href or nested path (e.g. /contacts/abc).
 * - `/settings` never matches `/settings/integrations`.
 */
export function isNavItemActive(
  pathname: string,
  href: string,
  exact?: boolean
): boolean {
  if (exact) return pathname === href;
  if (href === "/settings") return pathname === "/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}
