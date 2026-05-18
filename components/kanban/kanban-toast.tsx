"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type KanbanToastPayload = {
  id: string;
  message: string;
  retry?: () => void;
};

let pushToast: ((t: Omit<KanbanToastPayload, "id">) => void) | null = null;

export function showKanbanToast(payload: Omit<KanbanToastPayload, "id">) {
  pushToast?.(payload);
}

export function KanbanToastHost() {
  const [toasts, setToasts] = useState<KanbanToastPayload[]>([]);

  useEffect(() => {
    pushToast = (payload) => {
      const id = `toast-${Date.now()}`;
      setToasts((prev) => [...prev, { ...payload, id }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 8000);
    };
    return () => { pushToast = null; };
  }, []);

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            "pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border border-destructive/30",
            "bg-background px-4 py-3 shadow-lg",
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{t.message}</p>
            {t.retry && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-7 px-2 text-xs"
                onClick={() => {
                  t.retry?.();
                  setToasts((p) => p.filter((x) => x.id !== t.id));
                }}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Tentar novamente
              </Button>
            )}
          </div>
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
            onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
