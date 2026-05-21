import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** Primary actions — visible from `sm` up (use FAB on mobile). */
  action?: React.ReactNode;
  /** Full-width row below title (view toggles, etc.). */
  toolbar?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  icon,
  action,
  toolbar,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon && (
            <div className={cn(ds.pageIconWell, "mt-0.5")} aria-hidden>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && (
          <div className="hidden shrink-0 sm:flex sm:items-center">{action}</div>
        )}
      </div>
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
      )}
    </div>
  );
}
