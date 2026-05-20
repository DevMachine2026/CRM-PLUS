import { cn } from "@/lib/utils";
import { ds } from "@/lib/design-system";

type ListCardProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "div" | "article";
};

/** Spacious list row card — replaces dense tables on all breakpoints. */
export function ListCard({
  children,
  className,
  onClick,
  as: Tag = "article",
}: ListCardProps) {
  return (
    <Tag
      className={cn(
        ds.listCard,
        onClick && ds.listCardInteractive,
        className
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </Tag>
  );
}

export function ListCardStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(ds.listStack, className)}>{children}</div>;
}
