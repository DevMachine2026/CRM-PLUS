"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client-fetch";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Smartphone,
  Zap,
  Unplug,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ChannelConnectionState } from "@/lib/integrations/connection-state";
import { ConnectionStatusPill } from "@/components/integrations/connection-status-pill";
import { WhatsAppConnectSheet } from "@/components/integrations/whatsapp-connect-sheet";
import { InstagramConnectSheet } from "@/components/integrations/instagram-connect-sheet";
import { AiAgentIntegrationSection } from "@/components/integrations/ai-agent-integration-section";
import type { TenantAiSettings } from "@/lib/ai/tenant-settings";

export type ChannelSnapshot = {
  state: ChannelConnectionState;
  subtitle?: string;
  webhookUrl?: string | null;
};

type Props = {
  canEdit: boolean;
  aiSettings: TenantAiSettings;
  whatsapp: ChannelSnapshot;
  instagram: ChannelSnapshot;
};

function ChannelCard({
  title,
  description,
  icon,
  iconClassName,
  snapshot,
  connectLabel,
  onConnect,
  onDisconnect,
  canEdit,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  iconClassName: string;
  snapshot: ChannelSnapshot;
  connectLabel: string;
  onConnect: () => void;
  onDisconnect?: () => void;
  canEdit: boolean;
}) {
  const connected = snapshot.state === "connected";

  return (
    <article className={cn(ds.listCard, "flex flex-col gap-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", iconClassName)}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">{title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            {snapshot.subtitle && connected && (
              <p className="mt-1 text-xs font-medium text-foreground/80">{snapshot.subtitle}</p>
            )}
          </div>
        </div>
        <ConnectionStatusPill state={snapshot.state} />
      </div>

      <div className="flex flex-wrap gap-2">
        {!connected && canEdit && (
          <Button
            type="button"
            size="lg"
            className={cn("flex-1 gap-2 rounded-xl sm:flex-none", ds.primaryAction)}
            onClick={onConnect}
          >
            <Zap className="h-4 w-4" />
            {connectLabel}
          </Button>
        )}
        {connected && canEdit && onDisconnect && (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onDisconnect}>
            <Unplug className="h-4 w-4" />
            Trocar número
          </Button>
        )}
      </div>
    </article>
  );
}

export function IntegrationsHubClient({
  canEdit,
  aiSettings,
  whatsapp,
  instagram,
}: Props) {
  const router = useRouter();
  const [waOpen, setWaOpen] = useState(false);
  const [igOpen, setIgOpen] = useState(false);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const whatsappPending =
    whatsapp.state === "awaiting_scan" ||
    whatsapp.state === "generating_qr" ||
    whatsapp.state === "awaiting_pairing";

  useEffect(() => {
    if (!whatsappPending || waOpen) return;

    let cancelled = false;

    async function tick() {
      const res = await apiFetch("/api/integrations/whatsapp/session");
      const json = await res.json().catch(() => ({}));
      if (cancelled || !res.ok) return;
      const data = (json as { data?: { state?: string } }).data;
      if (data?.state === "connected") refresh();
    }

    void tick();
    const id = setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [whatsappPending, waOpen, refresh]);

  useEffect(() => {
    if (whatsapp.state !== "connected") return;
    void apiFetch("/api/integrations/whatsapp/sync-webhook", { method: "POST" }).catch(() => {});
  }, [whatsapp.state]);

  async function replaceWhatsApp() {
    const res = await apiFetch("/api/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelType: "whatsapp", name: "Principal" }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: string }).error ?? "Não foi possível trocar o número.");
    }
    await refresh();
    setWaOpen(true);
  }

  return (
    <div className={cn(ds.pageStack, ds.pagePx, ds.pagePy)}>
      <PageHeader
        title="Integrações"
        description="Conecte canais e ative a agente de IA em poucos cliques."
        icon={
          <Link
            href="/settings"
            aria-label="Voltar para configurações"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ChannelCard
          title="WhatsApp"
          description="Receba e responda conversas pelo número da sua empresa."
          icon={<Smartphone className="h-6 w-6 text-green-700" />}
          iconClassName="bg-green-100"
          snapshot={whatsapp}
          connectLabel="Conectar WhatsApp"
          canEdit={canEdit}
          onConnect={() => setWaOpen(true)}
          onDisconnect={() => {
            void replaceWhatsApp().catch((e) =>
              alert(e instanceof Error ? e.message : "Erro ao trocar número."),
            );
          }}
        />
        <ChannelCard
          title="Instagram"
          description="Direct e comentários da página comercial no Instagram."
          icon={<Camera className="h-6 w-6 text-pink-700" />}
          iconClassName="bg-pink-100"
          snapshot={instagram}
          connectLabel="Conectar com Facebook"
          canEdit={canEdit}
          onConnect={() => setIgOpen(true)}
        />
      </div>

      <AiAgentIntegrationSection initial={aiSettings} canEdit={canEdit} />

      <details className="rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-muted-foreground">
          Configuração avançada (Meta API / tokens)
        </summary>
        <p className="mt-2 text-muted-foreground">
          Phone Number ID, tokens permanentes e verify tokens para integração direta com a Meta.
        </p>
        <Link
          href="/settings/integrations?mode=advanced"
          className={cn(
            buttonVariants({ variant: "link" }),
            "mt-1 inline-flex h-auto items-center gap-1 p-0",
          )}
        >
          Abrir formulário avançado
          <ChevronRight className="h-4 w-4" />
        </Link>
      </details>

      <WhatsAppConnectSheet
        open={waOpen}
        onOpenChange={setWaOpen}
        onConnected={refresh}
        resumePolling={whatsappPending}
      />
      <InstagramConnectSheet
        open={igOpen}
        onOpenChange={setIgOpen}
        onConnected={refresh}
      />
    </div>
  );
}
