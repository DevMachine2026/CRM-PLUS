"use client";

import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIntentBadge } from "@/lib/inbox/intent-labels";
import {
  effectivePriorityScore,
  priorityScoreClasses,
} from "@/lib/inbox/conversation-priority";
import { FormattedTime } from "@/components/inbox/formatted-time";

export type ConversationCardData = {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  detectedIntent: string | null;
  summaryText: string | null;
  priorityScore?: number;
  nextBestAction: string | null;
  contact: { id: string; name: string; email: string | null; leadScore?: number } | null;
  messages: { content: string; direction: string; sentAt: string }[];
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  resolved: "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  pending: "Pendente",
  resolved: "Resolvida",
};

type Props = {
  conv: ConversationCardData;
  channelIcon: React.ReactNode;
  isActive: boolean;
  onSelect: () => void;
};

export function ConversationCard({ conv, channelIcon, isActive, onSelect }: Props) {
  const lastMsg = conv.messages[0];
  const needsReply = conv.status === "open" && lastMsg?.direction === "inbound";
  const intentBadge = getIntentBadge(conv.detectedIntent);
  const score = effectivePriorityScore(conv.priorityScore ?? 0, conv.contact?.leadScore);
  const isGroupConv = conv.subject?.startsWith("wa-group:");
  const displayName = conv.contact?.name ?? conv.subject ?? "Sem contato";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors",
        isActive && "bg-muted",
        needsReply && !isActive && "border-l-2 border-l-orange-400"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {channelIcon}
          <span className="font-medium text-sm truncate">
            {displayName}
            {isGroupConv ? " (grupo)" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "text-[10px] font-semibold tabular-nums rounded-full px-1.5 py-0.5 border",
              priorityScoreClasses(score)
            )}
            title="Prioridade IA"
          >
            {score}
          </span>
          {needsReply && (
            <span
              className="h-2 w-2 rounded-full bg-orange-400 shrink-0"
              title="Aguarda resposta"
            />
          )}
          <FormattedTime
            iso={conv.lastMessageAt ?? conv.createdAt}
            mode="conversation"
            className="text-[10px] text-muted-foreground"
          />
        </div>
      </div>

      {conv.summaryText ? (
        <p className="text-xs text-foreground/80 line-clamp-1 mt-1" title={conv.summaryText}>
          {conv.summaryText}
        </p>
      ) : lastMsg ? (
        <p className="text-xs text-muted-foreground truncate mt-1 flex items-center gap-1">
          {lastMsg.direction === "outbound" && <CheckCheck className="w-3 h-3 shrink-0" />}
          {lastMsg.content}
        </p>
      ) : null}

      {conv.nextBestAction && (
        <p className="text-[11px] text-primary/90 line-clamp-1 mt-0.5 font-medium">
          → {conv.nextBestAction}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span className={cn("text-[10px] rounded-full px-1.5 py-0.5", STATUS_COLOR[conv.status])}>
          {STATUS_LABEL[conv.status] ?? conv.status}
        </span>
        {intentBadge && (
          <span
            className={cn(
              "text-[10px] rounded-full px-1.5 py-0.5 border font-medium",
              intentBadge.color
            )}
          >
            {intentBadge.label}
          </span>
        )}
      </div>
    </button>
  );
}
