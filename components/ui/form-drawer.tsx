"use client";

import { useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type FormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: () => void | Promise<void>;
  loading?: boolean;
  submitDisabled?: boolean;
  /** First focusable field inside the drawer */
  autoFocusSelector?: string;
  className?: string;
};

/**
 * Right-side drawer for quick create/edit flows — autofocus on first field.
 */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  onSubmit,
  loading = false,
  submitDisabled = false,
  autoFocusSelector = "input, textarea, select, [role=combobox]",
  className,
}: FormDrawerProps) {
  const formId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const el = bodyRef.current?.querySelector<HTMLElement>(autoFocusSelector);
      el?.focus();
    }, 120);
    return () => window.clearTimeout(t);
  }, [open, autoFocusSelector]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("w-full max-w-md sm:max-w-md", className)} showCloseButton>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody ref={bodyRef}>
          <form
            id={formId}
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            {children}
          </form>
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={loading || submitDisabled}
            className={cn("min-w-28", ds.primaryAction)}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
