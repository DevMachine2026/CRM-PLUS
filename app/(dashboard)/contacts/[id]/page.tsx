import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { can } from "@/lib/auth/permissions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Phone, Building2, Tag, Brain, Activity } from "lucide-react";
import { ContactSummaryCard } from "@/components/contact-summary-card";

export default async function ContactProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!can(session.user.role, "read", "contacts")) redirect("/dashboard");

  const { id } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: {
      id:        true,
      name:      true,
      email:     true,
      phone:     true,
      status:    true,
      leadScore: true,
      createdAt: true,
      company:   { select: { id: true, name: true } },
      tags:      { select: { tag: { select: { id: true, name: true, color: true } } } },
      opportunities: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id:     true,
          title:  true,
          value:  true,
          status: true,
          stage:  { select: { name: true } },
        },
      },
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 5,
        select: {
          id:            true,
          channel:       true,
          status:        true,
          lastMessageAt: true,
          _count:        { select: { messages: true } },
        },
      },
      tasks: {
        where:   { status: "pending" },
        orderBy: { dueAt: "asc" },
        take: 5,
        select: { id: true, title: true, dueAt: true, priority: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, type: true, title: true, description: true,
          scheduledAt: true, completedAt: true, createdAt: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!contact) notFound();

  const scoreColor =
    contact.leadScore >= 70 ? "text-red-500"
    : contact.leadScore >= 35 ? "text-yellow-500"
    : "text-blue-500";

  const scoreLabel =
    contact.leadScore >= 70 ? "Hot"
    : contact.leadScore >= 35 ? "Warm"
    : "Cold";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Contatos
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{contact.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {contact.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />{contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />{contact.phone}
              </span>
            )}
            {contact.company && (
              <Link
                href={`/companies/${contact.company.id}`}
                className="flex items-center gap-1 hover:underline"
              >
                <Building2 className="h-3 w-3" />{contact.company.name}
              </Link>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${scoreColor}`}>{contact.leadScore}</div>
          <div className={`text-sm font-medium ${scoreColor}`}>{scoreLabel}</div>
        </div>
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {contact.tags.map(({ tag }) => (
            <Badge key={tag.id} variant="outline">
              <Tag className="h-3 w-3 mr-1" />{tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Resumo IA */}
      <ContactSummaryCard contactId={contact.id} contactName={contact.name} />

      {/* Grid de info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Oportunidades */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contact.opportunities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma oportunidade</p>
            ) : contact.opportunities.map((opp) => (
              <div key={opp.id} className="text-xs p-2 rounded border">
                <div className="font-medium truncate">{opp.title}</div>
                <div className="text-muted-foreground flex justify-between">
                  <span>{opp.stage.name}</span>
                  <span>
                    R${Number(opp.value ?? 0).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tarefas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contact.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente</p>
            ) : contact.tasks.map((task) => (
              <div key={task.id} className="text-xs p-2 rounded border">
                <div className="font-medium truncate">{task.title}</div>
                {task.dueAt && (
                  <div className="text-muted-foreground">
                    {new Date(task.dueAt).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Conversas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversas Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contact.conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma conversa</p>
            ) : contact.conversations.map((conv) => (
              <Link key={conv.id} href={`/conversations/${conv.id}`} className="block">
                <div className="text-xs p-2 rounded border hover:bg-accent transition-colors">
                  <div className="flex justify-between">
                    <span className="capitalize font-medium">{conv.channel}</span>
                    <Badge
                      variant={conv.status === "open" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {conv.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {conv._count.messages} mensagens
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activities Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />Linha do Tempo de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contact.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
          ) : (
            <ol className="relative border-l border-muted ml-3">
              {contact.activities.map((a) => {
                const icon =
                  a.type === "call"      ? "📞" :
                  a.type === "meeting"   ? "🤝" :
                  a.type === "email"     ? "✉️" :
                  a.type === "note"      ? "📝" :
                  a.type === "whatsapp"  ? "💬" :
                  a.type === "instagram" ? "📸" : "•";
                return (
                  <li key={a.id} className="mb-5 ml-4">
                    <div className="absolute -left-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5">{icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.title}</p>
                        {a.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {a.user?.name ?? "Sistema"} · {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                          {a.scheduledAt && ` · agendado ${new Date(a.scheduledAt).toLocaleDateString("pt-BR")}`}
                          {a.completedAt && ` · concluído ${new Date(a.completedAt).toLocaleDateString("pt-BR")}`}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
