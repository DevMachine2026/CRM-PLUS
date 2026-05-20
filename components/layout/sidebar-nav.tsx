"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  GitBranch,
  TrendingUp,
  MessageSquare,
  CheckSquare,
  Receipt,
  Zap,
  BarChart3,
  Settings,
  UserCog,
  Plug,
  ChevronDown,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { isNavItemActive } from "@/lib/navigation";
import { ds } from "@/lib/design-system";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
  exact?: boolean;
};

/** Fluxo principal do vendedor */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Conversas", icon: MessageSquare, badge: true },
  { href: "/opportunities", label: "Oportunidades", icon: TrendingUp },
  { href: "/contacts", label: "Contatos", icon: Users },
];

/** Operações e back-office */
export const GESTAO_NAV_ITEMS: NavItem[] = [
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/products", label: "Produtos", icon: Package },
  { href: "/tasks", label: "Central de Tarefas", icon: CheckSquare, badge: true },
  { href: "/billing", label: "Faturamento", icon: Receipt },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/automations", label: "Automações", icon: Zap },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
];

export const FOOTER_NAV_ITEMS: NavItem[] = [
  { href: "/team", label: "Equipe", icon: UserCog },
  {
    href: "/settings/integrations",
    label: "Integrações",
    icon: Plug,
    exact: true,
  },
  { href: "/settings", label: "Configurações", icon: Settings, exact: true },
];

/** @deprecated */
export const MAIN_NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...GESTAO_NAV_ITEMS];
export const SETTINGS_NAV_ITEMS = FOOTER_NAV_ITEMS.filter(
  (i) => i.href.startsWith("/settings")
);
export const NAV_ITEMS: NavItem[] = [
  ...PRIMARY_NAV_ITEMS,
  ...GESTAO_NAV_ITEMS,
  ...FOOTER_NAV_ITEMS,
];

type SidebarNavProps = {
  id?: string;
  onNavigate?: () => void;
};

function NavLink({
  item,
  active,
  onNavigate,
  subtle,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  subtle?: boolean;
}) {
  const { href, label, icon: Icon, badge } = item;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        subtle ? ds.navLinkFooter : ds.navLink,
        subtle
          ? active
            ? ds.navLinkFooterActive
            : undefined
          : active
            ? ds.navLinkActive
            : ds.navLinkInactive
      )}
    >
      <Icon className={cn("shrink-0", subtle ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
          0
        </Badge>
      )}
    </Link>
  );
}

function NavList({
  items,
  pathname,
  onNavigate,
  subtle,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  subtle?: boolean;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href, item.exact);
        return (
          <li key={item.href}>
            <NavLink
              item={item}
              active={active}
              onNavigate={onNavigate}
              subtle={subtle}
            />
          </li>
        );
      })}
    </ul>
  );
}

function GestaoGroup({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const gestaoActive = GESTAO_NAV_ITEMS.some((item) =>
    isNavItemActive(pathname, item.href, item.exact)
  );
  const [open, setOpen] = useState(gestaoActive);

  useEffect(() => {
    if (gestaoActive) setOpen(true);
  }, [gestaoActive]);

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          ds.navLink,
          "w-full justify-between",
          gestaoActive ? ds.navLinkActive : ds.navLinkInactive
        )}
      >
        <span className="flex items-center gap-3">
          <FolderKanban className="h-4 w-4 shrink-0" />
          <span>Gestão</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <ul className="mt-0.5 space-y-0.5 border-l border-border/60 ml-5 pl-2">
            {GESTAO_NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item.href, item.exact);
              return (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={active}
                    onNavigate={onNavigate}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function SidebarNav({ id, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      id={id}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto py-4"
      aria-label="Menu principal"
    >
      <div className="shrink-0 space-y-0.5 px-2">
        <p className={ds.navSectionLabel}>Vendas</p>
        <NavList
          items={PRIMARY_NAV_ITEMS}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <GestaoGroup pathname={pathname} onNavigate={onNavigate} />
      </div>

      <div className="mt-auto shrink-0 border-t border-border/50 px-2 pt-3">
        <NavList
          items={FOOTER_NAV_ITEMS}
          pathname={pathname}
          onNavigate={onNavigate}
          subtle
        />
      </div>
    </nav>
  );
}
