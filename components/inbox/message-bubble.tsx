"use client";

import {
  Bot, User, Clock, Check, CheckCheck, AlertTriangle,
  ImageIcon, Mic, FileText, Film, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ConvMessage,
  deliveryState,
  mediaKind,
  isRenderableUrl,
} from "@/lib/inbox/message-types";
import { FormattedTime } from "@/components/inbox/formatted-time";

function DeliveryIndicator({ msg, hideFailed }: { msg: ConvMessage; hideFailed?: boolean }) {
  if (msg.direction !== "outbound") return null;
  const state = deliveryState(msg);
  if (hideFailed && state === "failed") return null;

  if (state === "sending") {
    return (
      <span className="inline-flex items-center gap-0.5 text-primary-foreground/60" title="Enviando">
        <Clock className="h-3 w-3 animate-pulse" />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-300" title={msg.deliveryError ?? "Falha no envio"}>
        <AlertTriangle className="h-3 w-3" />
      </span>
    );
  }
  if (state === "read" || state === "delivered") {
    return (
      <span className="inline-flex items-center text-primary-foreground/80" title={state === "read" ? "Lida" : "Entregue"}>
        <CheckCheck className="h-3 w-3" />
      </span>
    );
  }
  if (state === "simulated") {
    return (
      <span className="inline-flex items-center text-primary-foreground/50" title="Simulado (dev)">
        <Check className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-primary-foreground/70" title="Enviada">
      <Check className="h-3 w-3" />
    </span>
  );
}

function MediaPlaceholder({ kind, content }: { kind: ReturnType<typeof mediaKind>; content: string }) {
  const icon =
    kind === "image" ? <ImageIcon className="h-5 w-5" /> :
    kind === "audio" ? <Mic className="h-5 w-5" /> :
    kind === "video" ? <Film className="h-5 w-5" /> :
    <FileText className="h-5 w-5" />;

  const label =
    kind === "image" ? "Imagem" :
    kind === "audio" ? "Áudio" :
    kind === "video" ? "Vídeo" :
    "Arquivo";

  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-xs font-medium"
      aria-label={label}
    >
      {icon}
      <span className="max-w-[200px] truncate">{content.replace(/^\[|\]$/g, "") || label}</span>
    </div>
  );
}

function MessageBody({ msg }: { msg: ConvMessage }) {
  const kind = mediaKind(msg);
  const trimmed = msg.content.trim();

  if (kind === "image" && isRenderableUrl(trimmed)) {
    return (
      <a href={trimmed} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trimmed}
          alt="Imagem enviada"
          className="max-h-64 max-w-full rounded-lg object-contain"
          loading="lazy"
        />
      </a>
    );
  }

  if (kind === "audio" && isRenderableUrl(trimmed)) {
    return <audio controls src={trimmed} className="h-9 max-w-full" preload="metadata" />;
  }

  if (kind !== "text" && !isRenderableUrl(trimmed)) {
    return <MediaPlaceholder kind={kind} content={trimmed} />;
  }

  return (
    <p className="leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {msg.content}
    </p>
  );
}

type Props = {
  msg: ConvMessage;
  onRetry?: (msg: ConvMessage) => void;
  /** Oculta indicador de falha (ex.: tenant Z-API sem rota outbound). */
  hideFailedIndicator?: boolean;
};

export function MessageBubble({ msg, onRetry, hideFailedIndicator }: Props) {
  const isOut   = msg.direction === "outbound";
  const isBot   = msg.senderType === "bot";
  const state   = deliveryState(msg);
  const pending = msg.pending || state === "sending";
  const failed  = !hideFailedIndicator && (msg.failed || state === "failed");

  return (
    <div className={cn("flex gap-2", isOut ? "justify-end" : "justify-start")}>
      {!isOut && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
          {isBot
            ? <Bot className="h-3.5 w-3.5 text-purple-600" />
            : <User className="h-3.5 w-3.5 text-slate-500" />}
        </div>
      )}

      <div
        className={cn(
          "group max-w-[min(70%,28rem)] rounded-2xl px-4 py-2 text-sm shadow-sm transition-opacity duration-200",
          isOut
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border bg-background",
          pending && "opacity-60",
          failed && isOut && "ring-1 ring-red-400/50",
        )}
      >
        <MessageBody msg={msg} />

        <div className={cn(
          "mt-1 flex items-center justify-end gap-1.5 text-[10px]",
          isOut ? "text-primary-foreground/70" : "text-muted-foreground",
        )}>
          {failed && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(msg)}
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium transition-colors",
                isOut ? "hover:bg-primary-foreground/15" : "hover:bg-muted",
              )}
              title="Tentar enviar novamente"
            >
              <RotateCcw className="h-3 w-3" />
              Reenviar
            </button>
          )}
          <FormattedTime iso={msg.sentAt} suffix={isBot ? " · IA" : undefined} />
          <DeliveryIndicator msg={msg} hideFailed={hideFailedIndicator} />
        </div>
      </div>
    </div>
  );
}
