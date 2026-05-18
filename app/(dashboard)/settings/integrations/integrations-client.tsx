"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Smartphone, Camera, CheckCircle2, AlertCircle,
  ExternalLink, Save, Loader2, Trash2, Eye, EyeOff, Copy, Check,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Badge }    from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

// ── Types ────────────────────────────────────────────────────────────────────

type IntegrationData = {
  id:             string;
  channelType:    "whatsapp" | "instagram";
  name:           string;
  isActive:       boolean;
  webhookUrl:     string | null;
  configuredKeys: string[];
  updatedAt:      string;
};

type ChannelForm = {
  phoneNumberId?: string;  // WhatsApp
  accessToken:    string;
  verifyToken:    string;
  pageId?:        string;  // Instagram
};

function emptyForm(): ChannelForm {
  return { phoneNumberId: "", accessToken: "", verifyToken: "", pageId: "" };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function SecretInput({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Channel Card ─────────────────────────────────────────────────────────────

function ChannelCard({
  channel, label, description, icon: Icon, iconBg, iconColor,
  webhookUrl, integration, canEdit,
  fields,
}: {
  channel:     "whatsapp" | "instagram";
  label:       string;
  description: string;
  icon:        React.ElementType;
  iconBg:      string;
  iconColor:   string;
  webhookUrl:  string;
  integration: IntegrationData | null;
  canEdit:     boolean;
  fields:      Array<{
    key:         keyof ChannelForm;
    label:       string;
    secret?:     boolean;
    placeholder?: string;
  }>;
}) {
  const [form,    setForm]    = useState<ChannelForm>(emptyForm());
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ok,      setOk]      = useState(false);
  const [error,   setError]   = useState("");
  const [active,  setActive]  = useState(integration?.isActive ?? true);

  const isConfigured = (integration?.configuredKeys.length ?? 0) > 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setOk(false); setError("");

    // Build credentials object — only include non-empty values
    const credentials: Record<string, string> = {};
    for (const f of fields) {
      const val = form[f.key] ?? "";
      if (val.trim()) credentials[f.key] = val.trim();
    }

    try {
      const res  = await fetch("/api/integrations", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ channelType: channel, name: "Principal", isActive: active, credentials }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar.");
      setOk(true);
      setForm(emptyForm()); // clear sensitive fields after save
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
      const res  = await fetch("/api/integrations", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ channelType: channel, name: "Principal" }),
      });
      if (!res.ok) throw new Error("Erro ao remover.");
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao remover.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggle(checked: boolean) {
    setActive(checked);
    await fetch("/api/integrations", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        channelType: channel, name: "Principal",
        isActive: checked,
        credentials: {},
      }),
    });
  }

  const f = (key: keyof ChannelForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured && canEdit && (
              <button
                type="button"
                onClick={() => handleToggle(!active)}
                aria-label={active ? "Desativar integração" : "Ativar integração"}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={active ? "Clique para desativar" : "Clique para ativar"}
              >
                {active
                  ? <ToggleRight className="h-7 w-7 text-green-600" />
                  : <ToggleLeft  className="h-7 w-7" />}
              </button>
            )}
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${isConfigured ? "text-green-700 border-green-300" : "text-muted-foreground"}`}
            >
              {isConfigured
                ? <><CheckCircle2 className="h-3 w-3" />Configurado</>
                : <><AlertCircle  className="h-3 w-3" />Configurar</>}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Webhook URL */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Webhook URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded border bg-muted/60 px-3 py-2 text-xs font-mono break-all">
              {webhookUrl}
            </code>
            <CopyButton text={webhookUrl} />
          </div>
        </div>

        {/* Configured keys info */}
        {isConfigured && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground">Campos configurados:</span>
            {integration!.configuredKeys.map((k) => (
              <Badge key={k} variant="secondary" className="text-xs font-mono">{k}</Badge>
            ))}
          </div>
        )}

        {/* Credentials form */}
        {canEdit && (
          <form onSubmit={handleSave} className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">
              {isConfigured ? "Atualizar credenciais" : "Inserir credenciais"}
            </p>
            <p className="text-xs text-muted-foreground">
              Os valores são armazenados de forma segura. Preencha apenas os campos que deseja atualizar.
            </p>

            {fields.map((field) =>
              field.secret ? (
                <SecretInput
                  key={field.key}
                  label={field.label}
                  value={form[field.key] ?? ""}
                  onChange={f(field.key)}
                  placeholder={field.placeholder ?? ""}
                />
              ) : (
                <div key={field.key} className="space-y-1">
                  <Label>{field.label}</Label>
                  <Input
                    value={form[field.key] ?? ""}
                    onChange={(e) => f(field.key)(e.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              )
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
            {ok    && <p className="text-xs text-green-600">Credenciais salvas com sucesso!</p>}

            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Save    className="mr-1.5 h-4 w-4" />}
                Salvar
              </Button>

              {isConfigured && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting
                    ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    : <Trash2  className="mr-1.5 h-4 w-4" />}
                  Remover integração
                </Button>
              )}
            </div>
          </form>
        )}

        {/* Meta dev link */}
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

// ── Main component ────────────────────────────────────────────────────────────

export function IntegrationsClient({
  baseUrl,
  initialIntegrations,
  canEdit,
}: {
  baseUrl:              string;
  initialIntegrations:  IntegrationData[];
  canEdit:              boolean;
}) {
  const [integrations, setIntegrations] = useState<IntegrationData[]>(initialIntegrations);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/integrations");
      const json = await res.json();
      if (res.ok) setIntegrations(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const wa = integrations.find((i) => i.channelType === "whatsapp") ?? null;
  const ig = integrations.find((i) => i.channelType === "instagram") ?? null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Configurações
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure os canais de comunicação externos para receber e enviar mensagens automaticamente.
          </p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* WhatsApp */}
      <ChannelCard
        channel="whatsapp"
        label="WhatsApp Business API"
        description="Meta / WhatsApp Cloud API via webhook"
        icon={Smartphone}
        iconBg="bg-green-100"
        iconColor="text-green-600"
        webhookUrl={`${baseUrl}/api/webhooks/whatsapp`}
        integration={wa}
        canEdit={canEdit}
        fields={[
          { key: "phoneNumberId", label: "Phone Number ID",     placeholder: "1234567890" },
          { key: "accessToken",   label: "Access Token",         secret: true, placeholder: "EAAxxxxxxx" },
          { key: "verifyToken",   label: "Verify Token (webhook)", placeholder: "seu_token_secreto" },
        ]}
      />

      {/* Instagram */}
      <ChannelCard
        channel="instagram"
        label="Instagram Messaging"
        description="Meta / Instagram Graph API via webhook"
        icon={Camera}
        iconBg="bg-pink-100"
        iconColor="text-pink-600"
        webhookUrl={`${baseUrl}/api/webhooks/instagram`}
        integration={ig}
        canEdit={canEdit}
        fields={[
          { key: "pageId",      label: "Page ID (Instagram Business)", placeholder: "123456789" },
          { key: "accessToken", label: "Access Token",                  secret: true, placeholder: "EAAxxxxxxx" },
          { key: "verifyToken", label: "Verify Token (webhook)",         placeholder: "seu_token_secreto" },
        ]}
      />

      {/* Status note */}
      <Card className="border-muted bg-muted/20">
        <CardContent className="flex items-start gap-3 p-4">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p>
              As credenciais são usadas automaticamente para identificar o tenant
              ao receber mensagens (sem necessidade de <code className="bg-muted rounded px-1">?tenantId</code> na URL).
              As mensagens recebidas aparecem na{" "}
              <Link href="/inbox" className="underline text-foreground">caixa de entrada</Link>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
