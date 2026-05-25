"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client-fetch";
import { formatPhoneDisplay } from "@/lib/integrations/evolution-go/phone";

const WHATSAPP_QR_IMAGE_PATH = "/api/integrations/whatsapp/qr";
import { Loader2, RefreshCw, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ConnectMethod = "qr" | "pairing";

type SessionData = {
  state: ChannelConnectionState;
  method?: ConnectMethod;
  qrUrl?: string | null;
  qrReady?: boolean;
  pairingCode?: string | null;
  targetPhone?: string | null;
  phoneNumber?: string;
  simulated?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
  /** Hub em "Aguardando leitura" — retoma polling sem novo POST */
  resumePolling?: boolean;
};

export function WhatsAppConnectSheet({
  open,
  onOpenChange,
  onConnected,
  resumePolling = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<ConnectMethod>("qr");
  const [phone, setPhone] = useState("");
  const [resetInstance, setResetInstance] = useState(true);
  const [qrKey, setQrKey] = useState(0);
  const [qrHard, setQrHard] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bumpQrImage = useCallback((hard = false) => {
    setQrLoaded(false);
    setQrKey((k) => k + 1);
    setQrHard(hard);
  }, []);

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
    const phone = data.phoneNumber?.replace(/\D/g, "") ?? "";
    if (data.state === "connected" && phone.length >= 10) {
      stopPoll();
      onConnected();
    }
  }, [onConnected, stopPoll]);

  async function startConnect(chosenMethod: ConnectMethod) {
    setLoading(true);
    setError(null);
    setQrLoaded(false);
    try {
      const res = await apiFetch("/api/integrations/whatsapp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: chosenMethod,
          phone: chosenMethod === "pairing" ? phone : undefined,
          reset: resetInstance,
        }),
      });
      const text = await res.text();
      const json = text ? (JSON.parse(text) as { error?: string; data?: SessionData }) : {};
      if (!res.ok) throw new Error(json.error ?? "Não foi possível iniciar a conexão.");
      const data = json.data as SessionData;
      setSession(data);
      if (chosenMethod === "qr") bumpQrImage();
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
      return () => stopPoll();
    }

    if (!resumePolling) return () => stopPoll();

    void pollStatus().catch((e) => setError(e instanceof Error ? e.message : "Erro."));
    pollRef.current = setInterval(() => {
      void pollStatus().catch((e) => setError(e instanceof Error ? e.message : "Erro."));
    }, 2500);

    return () => stopPoll();
  }, [open, resumePolling, pollStatus, stopPoll]);

  const state = session?.state ?? "disconnected";
  const activeMethod = session?.method ?? method;
  const pending =
    state === "generating_qr" || state === "awaiting_scan" || state === "awaiting_pairing";
  const canLoadQrImg =
    activeMethod === "qr" && state === "awaiting_scan" && !loading && !!session?.qrUrl;

  useEffect(() => {
    if (!open || !canLoadQrImg || qrLoaded) return;
    const id = setInterval(() => bumpQrImage(), 3500);
    return () => clearInterval(id);
  }, [open, canLoadQrImg, qrLoaded, bumpQrImage]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            Conectar WhatsApp
          </SheetTitle>
          <SheetDescription>
            Use o <strong>QR Code</strong>: o número conectado é sempre o do celular que escanear —
            não precisa digitar telefone. Tudo direto no app, sem link externo.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="flex items-center justify-between">
            <ConnectionStatusPill state={state} />
            {session?.simulated && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Modo demo
              </span>
            )}
          </div>

          {state === "disconnected" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod("qr")}
                  className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                    method === "qr"
                      ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <p className="font-semibold">QR Code</p>
                  <p className="mt-1 text-xs text-muted-foreground">Recomendado — define o número</p>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("pairing")}
                  className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                    method === "pairing"
                      ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <p className="font-semibold">Código no celular</p>
                  <p className="mt-1 text-xs text-muted-foreground">Alternativa (8 dígitos)</p>
                </button>
              </div>

              {method === "pairing" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Número do WhatsApp (com DDD)
                  </label>
                  <Input
                    placeholder="5511987654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                  <p className="text-xs text-muted-foreground">
                    Só para gerar o código — o número final ainda vem do aparelho que confirmar no
                    WhatsApp.
                  </p>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={resetInstance}
                  onChange={(e) => setResetInstance(e.target.checked)}
                  className="rounded"
                />
                Limpar conexão anterior no servidor (recomendado)
              </label>

              <Button
                size="lg"
                className="w-full gap-2 rounded-xl"
                onClick={() => startConnect(method)}
                disabled={loading || (method === "pairing" && !phone.trim())}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                Gerar {method === "pairing" ? "código" : "QR Code"}
              </Button>
            </div>
          )}

          {pending && activeMethod === "pairing" && (
            <div className="space-y-4 text-center">
              <p className="text-sm font-medium">Digite este código no WhatsApp</p>
              {session?.targetPhone && (
                <p className="text-xs text-muted-foreground">
                  Número: {formatPhoneDisplay(session.targetPhone)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                WhatsApp → Aparelhos conectados → Conectar dispositivo → Conectar com número de
                telefone
              </p>
              <div className="mx-auto rounded-xl border bg-white px-6 py-8 shadow-sm">
                {session?.pairingCode ? (
                  <p className="font-mono text-4xl font-bold tracking-[0.35em] text-foreground">
                    {session.pairingCode}
                  </p>
                ) : (
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )}

          {pending && activeMethod === "qr" && (
            <div className="space-y-4 text-center">
              <p className="text-sm font-medium">Escaneie o QR Code no celular da empresa</p>
              <p className="text-xs text-muted-foreground">
                WhatsApp → Aparelhos conectados → Conectar dispositivo →{" "}
                <strong>Escanear QR</strong>
              </p>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                QR oficial do WhatsApp (Evolution). Expira em ~60s — use <strong>Atualizar QR</strong>{" "}
                se não ler.
              </p>
              <div className="mx-auto inline-block rounded-2xl border-[3px] border-neutral-900 bg-white p-5 shadow-md">
                {!canLoadQrImg || !qrLoaded ? (
                  <div className="flex size-[280px] flex-col items-center justify-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {loading || state === "generating_qr"
                        ? "Preparando sessão…"
                        : "Carregando QR…"}
                    </p>
                  </div>
                ) : null}
                {canLoadQrImg ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={qrKey}
                    src={`${session?.qrUrl ?? WHATSAPP_QR_IMAGE_PATH}?r=${qrKey}${qrHard ? "&hard=1" : ""}`}
                    alt="QR Code WhatsApp"
                    width={280}
                    height={280}
                    className={`block size-[280px] [image-rendering:pixelated]${qrLoaded ? "" : " sr-only"}`}
                    onLoad={() => {
                      setQrLoaded(true);
                      setError(null);
                    }}
                    onError={() => {
                      setQrLoaded(false);
                      setError(
                        "QR ainda não disponível. Aguarde 3 segundos e toque em Atualizar QR.",
                      );
                    }}
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={loading}
                  onClick={() => {
                    bumpQrImage(true);
                    void pollStatus();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar QR
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    setMethod("pairing");
                    setSession(null);
                    setQrLoaded(false);
                    stopPoll();
                  }}
                >
                  Não consegue ler? Usar código de 8 dígitos no celular
                </button>
              </div>
            </div>
          )}

          {state === "connected" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <p className="text-lg font-semibold text-green-800">WhatsApp conectado!</p>
              {session?.phoneNumber && (
                <>
                  <p className="mt-2 text-xs text-green-800/80">
                    {activeMethod === "qr"
                      ? "Número vinculado (celular que escaneou o QR):"
                      : "Número vinculado (aparelho confirmado no WhatsApp):"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-green-700">
                    {formatPhoneDisplay(session.phoneNumber)}
                  </p>
                </>
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
