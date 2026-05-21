"use client";

import { useRef, useState } from "react";
import { Loader2, Palette, Save, ImageIcon, Upload } from "lucide-react";
import { apiFetch } from "@/lib/api/client-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BRAND_COLOR_PRESETS,
  DEFAULT_BRANDING,
  normalizeTenantBranding,
  type TenantBranding,
} from "@/lib/tenant/branding-settings";
import { cn } from "@/lib/utils";

type Props = {
  initial: TenantBranding;
  canEdit: boolean;
};

export function BrandingSection({ initial, canEdit }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    logoUrl: initial.logoUrl ?? "",
    primaryColor: initial.primaryColor ?? DEFAULT_BRANDING.primaryColor!,
    displayName: initial.displayName ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveBranding(partial?: Partial<typeof form>) {
    if (!canEdit) return;
    const raw = { ...form, ...partial };
    const branding = normalizeTenantBranding({
      logoUrl: raw.logoUrl,
      primaryColor: raw.primaryColor,
      displayName: raw.displayName,
    });
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { branding },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail =
          json.details?.fieldErrors?.branding?.[0] ??
          json.error ??
          "Não foi possível salvar.";
        throw new Error(detail);
      }
      setForm({
        logoUrl: branding.logoUrl ?? "",
        primaryColor: branding.primaryColor ?? DEFAULT_BRANDING.primaryColor!,
        displayName: branding.displayName ?? "",
      });
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await apiFetch("/api/settings/branding/logo", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha no upload.");
      setForm((f) => ({ ...f, logoUrl: json.data.logoUrl }));
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro no upload.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Marca da empresa
        </CardTitle>
        <CardDescription>
          A cor aparece no menu lateral, botões principais, ícones de página e
          detalhes de foco — de forma sutil, no estilo do CRM. O preset Preto
          mantém o visual padrão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="displayName">Nome no menu</Label>
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) =>
              setForm((f) => ({ ...f, displayName: e.target.value }))
            }
            disabled={!canEdit}
            placeholder="Minha Empresa"
          />
        </div>

        <div className="space-y-3">
          <Label>Logo</Label>
          <p className="text-xs text-muted-foreground">
            Envie PNG/JPG/WebP/SVG (até 400 KB) ou cole uma URL pública.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={!canEdit || uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleLogoUpload(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!canEdit || uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Enviar arquivo
            </Button>
          </div>
          <Input
            type="url"
            value={form.logoUrl.startsWith("data:") ? "" : form.logoUrl}
            onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
            disabled={!canEdit}
            placeholder="https://seusite.com/logo.png"
          />
          {(form.logoUrl.startsWith("data:") || form.logoUrl.startsWith("http")) && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logoUrl}
                alt="Prévia da logo"
                className="h-10 max-w-[180px] object-contain"
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label>Cor principal</Label>
          <div className="flex flex-wrap gap-2">
            {BRAND_COLOR_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                disabled={!canEdit}
                title={p.label}
                onClick={() => setForm((f) => ({ ...f, primaryColor: p.value }))}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition-transform hover:scale-105",
                  form.primaryColor === p.value
                    ? "border-foreground ring-2 ring-ring"
                    : "border-transparent",
                )}
                style={{ backgroundColor: p.value }}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, primaryColor: e.target.value }))
              }
              disabled={!canEdit}
              className="h-11 w-14 cursor-pointer rounded-lg border"
            />
            <Input
              value={form.primaryColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, primaryColor: e.target.value }))
              }
              disabled={!canEdit}
              className="max-w-[140px] font-mono text-sm"
            />
          </div>
          <div
            className="mt-2 rounded-xl border border-border/60 bg-muted/20 p-4"
            aria-hidden
          >
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Prévia da paleta
            </p>
            <div className="flex flex-wrap items-stretch gap-4">
              <div
                className="flex w-36 shrink-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-background"
                style={
                  form.primaryColor !== "#171717"
                    ? { borderLeftWidth: 3, borderLeftColor: form.primaryColor }
                    : undefined
                }
              >
                <div
                  className="border-b px-2 py-2 text-xs font-semibold"
                  style={
                    form.primaryColor !== "#171717"
                      ? {
                          background: `color-mix(in oklab, ${form.primaryColor} 4%, white)`,
                        }
                      : undefined
                  }
                >
                  {form.displayName || "Sua empresa"}
                </div>
                <div
                  className="mx-1 my-1 rounded-md px-2 py-1.5 text-xs font-medium"
                  style={
                    form.primaryColor !== "#171717"
                      ? {
                          color: form.primaryColor,
                          background: `color-mix(in oklab, ${form.primaryColor} 12%, transparent)`,
                          boxShadow: `inset 3px 0 0 0 ${form.primaryColor}`,
                        }
                      : { background: "rgba(0,0,0,0.04)" }
                  }
                >
                  Dashboard
                </div>
                <div className="mx-1 mb-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground">
                  Contatos
                </div>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"
                  style={{ backgroundColor: form.primaryColor }}
                >
                  Nova oportunidade
                </button>
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm"
                  style={
                    form.primaryColor !== "#171717"
                      ? {
                          color: form.primaryColor,
                          background: `color-mix(in oklab, ${form.primaryColor} 12%, transparent)`,
                        }
                      : { background: "rgba(0,0,0,0.06)" }
                  }
                >
                  ◆
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {canEdit && (
          <Button
            onClick={() => void saveBranding()}
            disabled={saving || uploading}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar marca
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
