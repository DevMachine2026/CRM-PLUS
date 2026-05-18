import { prisma } from "@/lib/db/client";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, User, Smartphone, Camera, AtSign, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const conv = await prisma.conversation.findFirst({
    where: { id },
    select: { contact: { select: { name: true } }, subject: true },
  });
  const title = conv?.subject ?? conv?.contact?.name ?? "Conversa";
  return { title: `${title} — CRM PLUS` };
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp:  <Smartphone className="h-4 w-4 text-green-600" />,
  instagram: <Camera     className="h-4 w-4 text-pink-600"  />,
  email:     <AtSign     className="h-4 w-4 text-blue-600"  />,
  manual:    <MessageSquare className="h-4 w-4 text-slate-500" />,
};
const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp", instagram: "Instagram", email: "E-mail", manual: "Manual",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  open: "default", pending: "secondary", resolved: "outline",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Aberta", pending: "Pendente", resolved: "Resolvida",
};

export default async function ConversationPage({ params }: Props) {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "conversations");

  const { id } = await params;

  const conv = await prisma.conversation.findFirst({
    where: { id, tenantId: session.tenantId },
    select: {
      id: true, channel: true, status: true, subject: true,
      summaryText: true, detectedIntent: true,
      lastMessageAt: true, createdAt: true,
      contact:      { select: { id: true, name: true, email: true, phone: true } },
      assignedUser: { select: { id: true, name: true } },
      messages: {
        orderBy: { sentAt: "asc" },
        select: {
          id: true, content: true, direction: true, senderType: true,
          senderId: true, sentAt: true,
        },
      },
    },
  });

  if (!conv) notFound();

  const fmtTime = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");

  let lastDateLabel = "";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      {/* Back */}
      <Link href="/inbox">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Conversas
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            {CHANNEL_ICON[conv.channel]}
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {conv.subject ?? conv.contact?.name ?? "Conversa sem título"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{CHANNEL_LABEL[conv.channel] ?? conv.channel}</span>
              {conv.contact && (
                <>
                  <span>·</span>
                  <Link href={`/contacts/${conv.contact.id}`} className="hover:underline">
                    {conv.contact.name}
                  </Link>
                </>
              )}
              {conv.assignedUser && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{conv.assignedUser.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[conv.status] ?? "outline"}>
          {STATUS_LABEL[conv.status] ?? conv.status}
        </Badge>
      </div>

      {/* AI summary */}
      {conv.summaryText && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm text-primary">
              <Bot className="h-4 w-4" />Resumo gerado por IA
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm">{conv.summaryText}</p>
            {conv.detectedIntent && (
              <p className="mt-1 text-xs text-muted-foreground">Intenção detectada: <strong>{conv.detectedIntent}</strong></p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4" />{conv.messages.length} mensagem{conv.messages.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {conv.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem nesta conversa.</p>
            ) : conv.messages.map((msg) => {
              const dateLabel = fmtDate(msg.sentAt);
              const showDate  = dateLabel !== lastDateLabel;
              lastDateLabel   = dateLabel;
              const isOutbound = msg.direction === "outbound";
              const isBot      = msg.senderType === "bot";

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-2 my-3">
                      <hr className="flex-1 border-muted" />
                      <span className="text-xs text-muted-foreground px-2">{dateLabel}</span>
                      <hr className="flex-1 border-muted" />
                    </div>
                  )}
                  <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                      isOutbound
                        ? isBot
                          ? "bg-primary/80 text-primary-foreground"
                          : "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}>
                      {isBot && (
                        <p className="text-[10px] font-semibold opacity-70 mb-0.5 flex items-center gap-1">
                          <Bot className="h-2.5 w-2.5" />IA
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={cn("text-[10px] mt-1 text-right", isOutbound ? "opacity-70" : "text-muted-foreground")}>
                        {fmtTime(msg.sentAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Iniciada em {fmtDate(conv.createdAt)}
        {conv.lastMessageAt && ` · Última mensagem ${fmtDate(conv.lastMessageAt)}`}
      </p>
    </div>
  );
}
