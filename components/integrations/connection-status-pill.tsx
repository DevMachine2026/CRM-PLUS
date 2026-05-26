"use client";

import { cn } from "@/lib/utils";
import type { ChannelConnectionState } from "@/lib/integrations/connection-state";
import { CHANNEL_STATE_LABEL } from "@/lib/integrations/connection-state";
import { Loader2 } from "lucide-react";

const STYLES: Record<ChannelConnectionState, string> = {
  disconnected:    "bg-muted text-muted-foreground",
  generating_qr:   "bg-amber-100 text-amber-800",
  awaiting_scan:   "bg-amber-100 text-amber-800",
  awaiting_pairing: "bg-amber-100 text-amber-800",
  connected:       "bg-green-100 text-green-800",
  error:           "bg-red-100 text-red-800",
};

export function ConnectionStatusPill({
  state,
  demo = false,
}: {
  state: ChannelConnectionState;
  demo?: boolean;
}) {
  const spinning =
    state === "generating_qr" || state === "awaiting_scan" || state === "awaiting_pairing";
  const label =
    state === "connected" && demo ? "Conectado (demo)" : CHANNEL_STATE_LABEL[state];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        STYLES[state],
      )}
    >
      {spinning && <Loader2 className="h-3 w-3 animate-spin" />}
      {state === "connected" && <span aria-hidden>🟢</span>}
      {label}
    </span>
  );
}
