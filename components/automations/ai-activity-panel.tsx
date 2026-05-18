"use client";

import { Bot, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { labelAiAction, statusBadge } from "@/lib/automations/log-timeline";

export type AiLogView = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  outputSummary: string | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function parseIntent(summary: string | null): string | null {
  if (!summary) return null;
  const m = summary.match(/intent=([a-z_]+)/i);
  if (!m?.[1]) return null;
  const map: Record<string, string> = {
    interest: "Interesse de compra",
    urgency: "Compra imediata",
    immediate_purchase: "Compra imediata",
    quote_request: "Pedido de orçamento",
    complaint: "Reclamação",
    losing_interest: "Perda de interesse",
    doubt: "Dúvida",
    neutral: "Neutro",
  };
  return map[m[1]] ?? null;
}

export function AiActivityPanel({ logs }: { logs: AiLogView[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhuma ação de IA registrada recentemente.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
      {logs.map((log) => {
        const intent = parseIntent(log.outputSummary);
        const badge = statusBadge("success");
        return (
          <div key={log.id} className="rounded-lg border bg-card p-3 flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-100">
              <Bot className="h-4 w-4 text-violet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{labelAiAction(log.action)}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-5 px-1.5",
                    "bg-green-100 text-green-800 border-green-200",
                  )}
                >
                  {badge.label}
                </Badge>
              </div>
              {intent && (
                <p className="text-xs text-muted-foreground mt-1">
                  IA analisou intenção como:{" "}
                  <span className="font-medium text-foreground">{intent}</span>
                </p>
              )}
              {!intent && log.outputSummary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {log.outputSummary}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(log.createdAt)}
                {log.entityType && (
                  <span className="capitalize">· {log.entityType}</span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
