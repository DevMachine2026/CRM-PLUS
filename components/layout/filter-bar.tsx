import { cn } from "@/lib/utils";

/** Mobile-first row of filters — stacks vertically, wraps on `sm+`. */
export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
        className
      )}
    >
      {children}
    </div>
  );
}
