import { Button } from "@/components/ui/button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type PrimaryActionButtonProps = React.ComponentProps<typeof Button>;

/** Prominent CTA — desktop header and inline actions. */
export function PrimaryActionButton({
  className,
  size = "default",
  ...props
}: PrimaryActionButtonProps) {
  return (
    <Button
      size={size}
      className={cn(
        "h-10 gap-2 rounded-xl px-4 text-sm font-semibold",
        ds.primaryAction,
        className
      )}
      {...props}
    />
  );
}
