"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client-fetch";
import { Loader2, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConnectionStatusPill } from "./connection-status-pill";
import type { ChannelConnectionState } from "@/lib/integrations/connection-state";

type SessionData = {
  state: ChannelConnectionState;
  qrCodeBase64?: string | null;
  phoneNumber?: string;
  simulated?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
};

export function WhatsAppConnectSheet({ open, onOpenChange, onConnected }: Props) {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async () => {
    const res = await apiFetch("/api/integrations/whatsapp/session");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao consultar status.");
    const data = json.data as SessionData;
    setSession(data);
    if (data.state === "connected") {
      stopPoll();
      onConnected();
    }
  }, [onConnected, stopPoll]);

  async function startConnect() {
    setLoading(true);
    setError(null);
    setSession({ state: "generating_qr" });
    try {
      const res = await apiFetch("/api/integrations/whatsapp/session", { method: "POST" });
      const text = await res.text();
      const json = text ? (JSON.parse(text) as { error?: string; data?: SessionData }) : {};
      if (!res.ok) throw new Error(json.error ?? "Não foi possível iniciar a conexão.");
      const data = json.data as SessionData;
      setSession(data);
      stopPoll();
      pollRef.current = setInterval(() => {
        void pollStatus().catch((e) => setError(e instanceof Error ? e.message : "Erro."));
      }, 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro.");
      setSession({ state: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      stopPoll();
      setSession(null);
      setError(null);
    }
    return () => stopPoll();
  }, [open, stopPoll]);

  const state = session?.state ?? "disconnected";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Conectar WhatsApp
          </SheetTitle>
          <SheetDescription>
            Escaneie o QR Code com o app WhatsApp no celular. A conexão é segura e leva menos de um minuto.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-6">
          <div className="flex items-center justify-between">
            <ConnectionStatusPill state={state} />
            {session?.simulated && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Modo demo</span>
            )}
          </div>

          {state === "disconnected" && (
            <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Um clique para gerar o QR Code e vincular seu número ao CRM.
              </p>
              <Button
                size="lg"
                className="w-full gap-2 rounded-xl"
                onClick={startConnect}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                Conectar WhatsApp
              </Button>
            </div>
          )}

          {(state === "generating_qr" || state === "awaiting_scan") && (
            <div className="space-y-4 text-center">
              <p className="text-sm font-medium">Aguardando leitura do QR Code…</p>
              <p className="text-xs text-muted-foreground">
                WhatsApp → Dispositivos conectados → Conectar dispositivo
              </p>
              <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-xl border bg-white p-3 shadow-sm">
                {session?.qrCodeBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.qrCodeBase64}
                    alt="QR Code WhatsApp"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )}

          {state === "connected" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <p className="text-lg font-semibold text-green-800">WhatsApp conectado!</p>
              {session?.phoneNumber && (
                <p className="mt-1 text-sm text-green-700">+{session.phoneNumber}</p>
              )}
              <Button className="mt-4 w-full" onClick={() => onOpenChange(false)}>
                Concluir
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
