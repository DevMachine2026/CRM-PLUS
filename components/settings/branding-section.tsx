"use client";

import { useState } from "react";
import { Loader2, Palette, Save, ImageIcon } from "lucide-react";
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
  DEFAULT_BRANDING,
  type TenantBranding,
} from "@/lib/tenant/branding-settings";

type Props = {
  initial: TenantBranding;
  canEdit: boolean;
};

export function BrandingSection({ initial, canEdit }: Props) {
  const [form, setForm] = useState({
    logoUrl: initial.logoUrl ?? "",
    primaryColor: initial.primaryColor ?? DEFAULT_BRANDING.primaryColor!,
    displayName: initial.displayName ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            branding: {
              logoUrl: form.logoUrl.trim() || "",
              primaryColor: form.primaryColor,
              displayName: form.displayName.trim() || "",
            },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível salvar.");
      setOk(true);
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
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
          Logo e cor aparecem no menu e nos botões principais do CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="displayName">Nome exibido no menu</Label>
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            disabled={!canEdit}
            placeholder="Minha Empresa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logoUrl">URL da logo</Label>
          <Input
            id="logoUrl"
            type="url"
            value={form.logoUrl}
            onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
            disabled={!canEdit}
            placeholder="https://seusite.com/logo.png"
          />
          <p className="text-xs text-muted-foreground">
            Use PNG ou SVG hospedado (site, Drive público, etc.). Recomendado: fundo
            transparente, até 200px de altura.
          </p>
          {form.logoUrl && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logoUrl}
                alt="Prévia da logo"
                className="h-10 max-w-[160px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryColor">Cor principal</Label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="primaryColor"
              type="color"
              value={form.primaryColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, primaryColor: e.target.value }))
              }
              disabled={!canEdit}
              className="h-11 w-14 cursor-pointer rounded-lg border border-input"
            />
            <Input
              value={form.primaryColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, primaryColor: e.target.value }))
              }
              disabled={!canEdit}
              className="max-w-[140px] font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              style={{ backgroundColor: form.primaryColor, color: "#fff" }}
            >
              Prévia
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {ok && <p className="text-sm text-green-600">Salvo. Atualizando…</p>}

        {canEdit && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
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
