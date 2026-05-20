"use client";

import { apiFetch } from "@/lib/api/client-fetch";
import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Smartphone, Camera, CheckCircle2, AlertCircle,
  ExternalLink, Save, Loader2, Trash2, Eye, EyeOff, Copy, Check,
  ToggleLeft, ToggleRight, HelpCircle, Plug, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { ds } from "@/lib/design-system";
import {
  getFieldHelp,
  getChannelFieldKeys,
  type IntegrationChannel,
  type MetaFieldKey,
} from "@/lib/integrations/meta-field-help";
import {
  getIntegrationConnectionStatus,
  STATUS_LABELS,
  type IntegrationConnectionStatus,
} from "@/lib/integrations/status";

// ── Types ────────────────────────────────────────────────────────────────────

export type IntegrationData = {
  id: string;
  channelType: IntegrationChannel;
  name: string;
  isActive: boolean;
  webhookUrl: string | null;
  configuredKeys: string[];
  updatedAt: string;
};

type ChannelForm = Record<MetaFieldKey, string>;

function emptyForm(channel: IntegrationChannel): ChannelForm {
  const keys = getChannelFieldKeys(channel);
  return Object.fromEntries(keys.map((k) => [k, ""])) as ChannelForm;
}

// ── Copy webhook ─────────────────────────────────────────────────────────────

function WebhookCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      className={cn(
        "shrink-0 gap-1.5 transition-colors",
        copied && "border-green-300 bg-green-50 text-green-800 hover:bg-green-50",
      )}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copiar URL de Webhook
        </>
      )}
    </Button>
  );
}

// ── Field helper ─────────────────────────────────────────────────────────────

function FieldLabelWithHelp({
  channel,
  fieldKey,
}: {
  channel: IntegrationChannel;
  fieldKey: MetaFieldKey;
}) {
  const meta = getFieldHelp(channel, fieldKey);
  if (!meta) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm">{meta.label}</Label>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="text-muted-foreground hover:text-foreground rounded-full p-0.5"
          aria-label={`Ajuda: ${meta.label}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-left">
          <p>{meta.help}</p>
          {meta.docUrl && (
            <a
              href={meta.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 underline font-medium"
            >
              {meta.docLabel ?? "Saiba mais"}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function SecretInput({
  channel,
  fieldKey,
  value,
  onChange,
}: {
  channel: IntegrationChannel;
  fieldKey: MetaFieldKey;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const meta = getFieldHelp(channel, fieldKey);

  return (
    <div className="space-y-1.5">
      <FieldLabelWithHelp channel={channel} fieldKey={fieldKey} />
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={meta?.placeholder}
          className="pr-10 font-mono text-sm"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Ocultar valor" : "Mostrar valor"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {meta?.docUrl && (
        <a
          href={meta.docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Onde encontrar o {meta.label}? Clique aqui
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function PlainField({
  channel,
  fieldKey,
  value,
  onChange,
}: {
  channel: IntegrationChannel;
  fieldKey: MetaFieldKey;
  value: string;
  onChange: (v: string) => void;
}) {
  const meta = getFieldHelp(channel, fieldKey);

  return (
    <div className="space-y-1.5">
      <FieldLabelWithHelp channel={channel} fieldKey={fieldKey} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={meta?.placeholder}
        className="font-mono text-sm"
        autoComplete="off"
      />
      {meta?.docUrl && (
        <a
          href={meta.docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Onde encontrar o {meta.label}? Clique aqui
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

// ── Status UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IntegrationConnectionStatus }) {
  if (status === "connected") {
    return (
      <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Conectado
      </Badge>
    );
  }
  if (status === "partial") {
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 gap-1">
        <AlertCircle className="h-3 w-3" />
        Incompleto
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <Plug className="h-3 w-3" />
      Não configurado
    </Badge>
  );
}

function ConnectionStatusPanel({
  status,
  channelLabel,
  configuredKeys,
  channel,
}: {
  status: IntegrationConnectionStatus;
  channelLabel: string;
  configuredKeys: string[];
  channel: IntegrationChannel;
}) {
  const meta = STATUS_LABELS[status];
  const required = getChannelFieldKeys(channel);
  const missing = required.filter((k) => !configuredKeys.includes(k));

  if (status === "connected") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/80 px-4 py-3 flex gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-900">{channelLabel} conectado</p>
          <p className="text-xs text-green-800/90 mt-0.5">{meta.description}</p>
          <p className="text-[11px] text-green-700/80 mt-1">
            Cole a URL do webhook no app Meta e use o mesmo Verify Token abaixo.
          </p>
        </div>
      </div>
    );
  }

  if (status === "partial") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900">Configuração incompleta</p>
          <p className="text-xs text-amber-800/90 mt-0.5">{meta.description}</p>
          {missing.length > 0 && (
            <p className="text-[11px] text-amber-800 mt-1">
              Faltam: {missing.map((k) => getFieldHelp(channel, k)?.label ?? k).join(", ")}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
        <Link2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">Conecte o {channelLabel}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
        {meta.description} Preencha os campos abaixo e salve — em poucos minutos sua equipe
        recebe mensagens na caixa de entrada.
      </p>
    </div>
  );
}

// ── Channel card ─────────────────────────────────────────────────────────────

function ChannelCard({
  channel,
  label,
  description,
  icon: Icon,
  iconBg,
  iconColor,
  webhookUrl,
  integration,
  canEdit,
  onSaved,
}: {
  channel: IntegrationChannel;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  webhookUrl: string;
  integration: IntegrationData | null;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ChannelForm>(() => emptyForm(channel));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(integration?.isActive ?? true);

  const configuredKeys = integration?.configuredKeys ?? [];
  const status = getIntegrationConnectionStatus(channel, configuredKeys);
  const fieldKeys = getChannelFieldKeys(channel);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setOk(false);
    setError("");

    const credentials: Record<string, string> = {};
    for (const key of fieldKeys) {
      const val = form[key] ?? "";
      if (val.trim()) credentials[key] = val.trim();
    }

    if (Object.keys(credentials).length === 0) {
      setError("Preencha pelo menos um campo para salvar.");
      setSaving(false);
      return;
    }

    try {
      const res = await apiFetch("/api/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelType: channel,
          name: "Principal",
          isActive: active,
          credentials,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar.");
      setOk(true);
      setForm(emptyForm(channel));
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remover integração ${label}?`)) return;
    setDeleting(true);
    try {
      const res = await apiFetch("/api/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelType: channel, name: "Principal" }),
      });
      if (!res.ok) throw new Error("Erro ao remover.");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao remover.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggle(checked: boolean) {
    setActive(checked);
    await apiFetch("/api/integrations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelType: channel,
        name: "Principal",
        isActive: checked,
        credentials: {},
      }),
    });
    onSaved();
  }

  return (
    <Card className={cn(status === "connected" && "border-green-200/80")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={status} />
            {status === "connected" && canEdit && (
              <button
                type="button"
                onClick={() => handleToggle(!active)}
                aria-label={active ? "Desativar integração" : "Ativar integração"}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={active ? "Integração ativa" : "Integração pausada"}
              >
                {active ? (
                  <ToggleRight className="h-7 w-7 text-green-600" />
                ) : (
                  <ToggleLeft className="h-7 w-7" />
                )}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <ConnectionStatusPanel
          status={status}
          channelLabel={label}
          configuredKeys={configuredKeys}
          channel={channel}
        />

        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Webhook (Meta)
          </p>
          <code className="block rounded border bg-background px-3 py-2 text-xs font-mono break-all">
            {webhookUrl}
          </code>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <WebhookCopyButton url={webhookUrl} />
            <span className="text-[11px] text-muted-foreground">
              Cole esta URL em Configuração do webhook no app Meta.
            </span>
          </div>
        </div>

        {configuredKeys.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground">Salvos no servidor:</span>
            {configuredKeys.map((k) => (
              <Badge key={k} variant="secondary" className="text-xs font-mono">
                {getFieldHelp(channel, k as MetaFieldKey)?.label ?? k}
              </Badge>
            ))}
          </div>
        )}

        {canEdit && (
          <form onSubmit={handleSave} className="space-y-4 border-t pt-4">
            <div>
              <p className="text-sm font-medium">
                {status === "empty" ? "Credenciais do Meta" : "Atualizar credenciais"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tokens não são exibidos após salvar. Preencha só o que deseja alterar.
              </p>
            </div>

            {fieldKeys.map((key) =>
              getFieldHelp(channel, key)?.secret ? (
                <SecretInput
                  key={key}
                  channel={channel}
                  fieldKey={key}
                  value={form[key] ?? ""}
                  onChange={(v) => setForm((prev) => ({ ...prev, [key]: v }))}
                />
              ) : (
                <PlainField
                  key={key}
                  channel={channel}
                  fieldKey={key}
                  value={form[key] ?? ""}
                  onChange={(v) => setForm((prev) => ({ ...prev, [key]: v }))}
                />
              ),
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
            {ok && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Credenciais salvas com sucesso!
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Salvar credenciais
              </Button>

              {status !== "empty" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-4 w-4" />
                  )}
                  Remover
                </Button>
              )}
            </div>
          </form>
        )}

        <a
          href="https://developers.facebook.com/apps"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir Meta for Developers
        </a>
      </CardContent>
    </Card>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function IntegrationsOverview({
  whatsappStatus,
  instagramStatus,
}: {
  whatsappStatus: IntegrationConnectionStatus;
  instagramStatus: IntegrationConnectionStatus;
}) {
  const connectedCount =
    (whatsappStatus === "connected" ? 1 : 0) +
    (instagramStatus === "connected" ? 1 : 0);

  return (
    <Card className="bg-muted/20">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-medium">Status das integrações</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {connectedCount === 2
              ? "WhatsApp e Instagram prontos para receber mensagens."
              : connectedCount === 1
                ? "Um canal conectado. Configure o outro para omnichannel completo."
                : "Nenhum canal conectado ainda — comece pelo WhatsApp ou Instagram."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
            <Smartphone className="h-4 w-4 text-green-600" />
            <StatusBadge status={whatsappStatus} />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
            <Camera className="h-4 w-4 text-pink-600" />
            <StatusBadge status={instagramStatus} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function IntegrationsClient({
  baseUrl,
  initialIntegrations,
  canEdit,
}: {
  baseUrl: string;
  initialIntegrations: IntegrationData[];
  canEdit: boolean;
}) {
  const [integrations, setIntegrations] = useState<IntegrationData[]>(initialIntegrations);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/integrations");
      const json = await res.json();
      if (res.ok) setIntegrations(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const wa = integrations.find((i) => i.channelType === "whatsapp") ?? null;
  const ig = integrations.find((i) => i.channelType === "instagram") ?? null;

  const waStatus = getIntegrationConnectionStatus("whatsapp", wa?.configuredKeys ?? []);
  const igStatus = getIntegrationConnectionStatus("instagram", ig?.configuredKeys ?? []);

  return (
    <TooltipProvider delay={200}>
      <div className={cn(ds.pageStack, ds.pagePbFab)}>
        <PageHeader
          title="Integrações"
          description="Conecte WhatsApp e Instagram da Meta: copie o webhook, cole os tokens e valide o status em um só lugar."
          toolbar={
            <Link
              href="/settings"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Configurações
            </Link>
          }
        />
        {loading && (
          <div className="flex justify-end">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        <MetricGrid className="items-stretch">
          <div className={cn(ds.listCard, "flex h-full min-h-[6.5rem] flex-col gap-2")}>
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-green-600" />
              <p className="text-xs font-medium text-muted-foreground">WhatsApp</p>
            </div>
            <StatusBadge status={waStatus} />
          </div>
          <div className={cn(ds.listCard, "flex h-full min-h-[6.5rem] flex-col gap-2")}>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-pink-600" />
              <p className="text-xs font-medium text-muted-foreground">Instagram</p>
            </div>
            <StatusBadge status={igStatus} />
          </div>
        </MetricGrid>

        <ChannelCard
          channel="whatsapp"
          label="WhatsApp Business API"
          description="Meta Cloud API — mensagens na caixa de entrada"
          icon={Smartphone}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          webhookUrl={`${baseUrl}/api/webhooks/whatsapp`}
          integration={wa}
          canEdit={canEdit}
          onSaved={refresh}
        />

        <ChannelCard
          channel="instagram"
          label="Instagram Messaging"
          description="Meta Graph API — DMs do Instagram Business"
          icon={Camera}
          iconBg="bg-pink-100"
          iconColor="text-pink-600"
          webhookUrl={`${baseUrl}/api/webhooks/instagram`}
          integration={ig}
          canEdit={canEdit}
          onSaved={refresh}
        />

        <Card className="border-muted bg-muted/20">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p>
                O <strong className="text-foreground">Phone Number ID</strong> e o{" "}
                <strong className="text-foreground">Page ID</strong> identificam sua conta na Meta
                e roteiam mensagens ao tenant certo — sem{" "}
                <code className="bg-muted rounded px-1">?tenantId</code> na URL.
              </p>
              <p className="mt-2">
                Mensagens recebidas aparecem na{" "}
                <Link href="/inbox" className="underline text-foreground">
                  caixa de entrada
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
