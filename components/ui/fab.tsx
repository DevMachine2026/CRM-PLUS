"use client";

import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type FabProps = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  className?: string;
};

/** Primary action on mobile — fixed bottom-right, hidden from `md` up. */
export function Fab({
  label,
  onClick,
  icon: Icon = Plus,
  className,
}: FabProps) {
  return (
    <Button
      type="button"
      size="icon"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed bottom-6 right-4 z-30 h-14 w-14 md:hidden",
        ds.fab,
        "max-md:bottom-[max(1.5rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      <Icon className="h-6 w-6" />
    </Button>
  );
}
