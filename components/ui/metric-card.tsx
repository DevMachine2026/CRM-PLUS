import { cn } from "@/lib/utils";
import { ds } from "@/lib/design-system";

type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
  valueClassName?: string;
};

export function MetricCard({
  label,
  value,
  hint,
  className,
  valueClassName,
}: MetricCardProps) {
  return (
    <div className={cn(ds.listCard, "flex h-full min-h-[6.5rem] flex-col", className)}>
      <p className="line-clamp-2 min-h-[2rem] text-xs font-medium leading-snug text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums tracking-tight",
          valueClassName
        )}
      >
        {value}
      </p>
      <p className="mt-auto min-h-[2.5rem] line-clamp-2 text-xs font-medium leading-snug text-muted-foreground">
        {hint ?? "\u00a0"}
      </p>
    </div>
  );
}

export function MetricGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(ds.metricGrid, "items-stretch [&>*]:h-full", className)}>
      {children}
    </div>
  );
}
