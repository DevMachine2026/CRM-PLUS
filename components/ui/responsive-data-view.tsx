import { cn } from "@/lib/utils";
import { ListCard, ListCardStack } from "@/components/ui/list-card";

type ResponsiveDataViewProps = {
  /** List cards — default on all breakpoints */
  mobile: React.ReactNode;
  /** Optional dense table — only when explicitly needed */
  desktop?: React.ReactNode;
  /** @default "list" */
  variant?: "list" | "split";
  className?: string;
};

/**
 * Clean list-first data display. Use `variant="split"` only for legacy table + mobile cards.
 */
export function ResponsiveDataView({
  mobile,
  desktop,
  variant = "list",
  className,
}: ResponsiveDataViewProps) {
  if (variant === "list" || !desktop) {
    return <ListCardStack className={className}>{mobile}</ListCardStack>;
  }

  return (
    <div className={cn("space-y-0", className)}>
      <ListCardStack className="md:hidden">{mobile}</ListCardStack>
      <TableScrollContainer className="hidden md:block">
        {desktop}
      </TableScrollContainer>
    </div>
  );
}

type TableScrollContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function TableScrollContainer({
  children,
  className,
}: TableScrollContainerProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="scrollbar-thin overflow-x-auto overscroll-x-contain rounded-xl border border-border/60 bg-card shadow-sm [-webkit-overflow-scrolling:touch]"
        role="region"
        aria-label="Tabela com rolagem horizontal"
        tabIndex={0}
      >
        <div className="min-w-[640px]">{children}</div>
      </div>
    </div>
  );
}

/** @deprecated Use `ListCard` */
export function MobileListCard(
  props: React.ComponentProps<typeof ListCard>
) {
  return <ListCard {...props} />;
}

export { ListCard, ListCardStack };
