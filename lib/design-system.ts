/**
 * CRM PLUS — minimal, Linear/Stripe-inspired design tokens (Tailwind fragments).
 */
export const ds = {
  pagePx: "px-4 md:px-8",
  pagePy: "py-6 md:py-8",
  pagePbFab: "pb-28 md:pb-8",
  pageStack: "flex w-full min-w-0 flex-col gap-6",

  /** Sidebar */
  navLink:
    "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
  navLinkActive:
    "bg-primary/10 font-medium text-primary shadow-[inset_3px_0_0_0_var(--primary)]",
  navLinkInactive:
    "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
  navLinkFooter:
    "flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors duration-200 hover:bg-primary/5 hover:text-foreground",
  navLinkFooterActive:
    "bg-primary/10 font-medium text-primary shadow-[inset_2px_0_0_0_var(--primary)]",
  navSectionLabel:
    "mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80",

  /** Cards & lists */
  listCard:
    "rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 md:p-6",
  listCardInteractive:
    "cursor-pointer hover:border-border hover:shadow-md active:scale-[0.995]",
  listStack: "flex flex-col gap-3 md:gap-4",
  metricGrid: "grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4",
  emptyState:
    "rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center",
  /** Ícone de página / módulo — destaque com cor da marca */
  pageIconWell:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5",

  /** Actions */
  primaryAction:
    "rounded-xl shadow-sm transition-all duration-200 ease-out hover:shadow-md active:scale-[0.98]",
  fab: "rounded-full shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95",

  touchTarget: "min-h-11 min-w-11",
  headerHeight: "h-14",
} as const;

/** @deprecated Prefer `ds` — kept for existing imports */
export const mobileLayout = {
  pagePx: ds.pagePx,
  pagePy: ds.pagePy,
  pagePbFab: ds.pagePbFab,
  pageStack: ds.pageStack,
  headerHeight: ds.headerHeight,
  touchTarget: ds.touchTarget,
  navLink: ds.navLink,
  card: "rounded-xl border border-border/60 bg-card p-5 shadow-sm md:p-6",
  metricGrid: ds.metricGrid,
} as const;
