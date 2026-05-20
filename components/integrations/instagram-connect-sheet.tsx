"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client-fetch";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type PageOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
};

export function InstagramConnectSheet({ open, onOpenChange, onConnected }: Props) {
  const [pages, setPages] = useState<PageOption[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoadingPages(true);
    void apiFetch("/api/integrations/instagram/connect")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao carregar páginas.");
        setPages(json.data?.pages ?? []);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Erro.");
      })
      .finally(() => setLoadingPages(false));
  }, [open]);

  async function connectPage(page: PageOption) {
    setConnectingId(page.id);
    setError(null);
    try {
      const res = await apiFetch("/api/integrations/instagram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, pageName: page.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível conectar.");
      onConnected();
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setConnectingId(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-pink-600" />
            Conectar Instagram
          </SheetTitle>
          <SheetDescription>
            Entre com Facebook e escolha a página comercial vinculada ao Instagram.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 rounded-xl border-[#1877F2]/30 bg-[#1877F2]/5 py-6 text-[#1877F2] hover:bg-[#1877F2]/10"
            disabled={loadingPages || !!connectingId}
            onClick={() => {
              /* fluxo OAuth real: window.location = meta oauth */
            }}
          >
            {loadingPages ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            Continuar com Facebook
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Selecione a página após o login
          </p>

          {loadingPages && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingPages && pages.length > 0 && (
            <ul className="space-y-2">
              {pages.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    disabled={!!connectingId}
                    onClick={() => void connectPage(page)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      "hover:border-pink-300 hover:bg-pink-50/50",
                      connectingId === page.id && "border-pink-400 bg-pink-50",
                    )}
                  >
                    <span className="font-medium">{page.name}</span>
                    {connectingId === page.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-pink-600" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Conectar</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-center text-sm text-destructive">{error}</p>}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
