"use client";

import { useCallback, useMemo, useState } from "react";
import { Bot, FlaskConical, Loader2, Save, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api/client-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DEFAULT_AI_SETTINGS,
  TONE_LABELS,
  tenantAiSettingsSchema,
  validateAiField,
  type TenantAiSettings,
} from "@/lib/ai/tenant-settings";

type FieldErrors = Partial<Record<keyof TenantAiSettings, string | null>>;

type TestResult = {
  status: "running" | "success" | "failed";
  message: string;
  sampleReply?: string;
};

type Props = {
  initial: TenantAiSettings;
  canEdit: boolean;
};

export function AiAgentConfig({ initial, canEdit }: Props) {
  const [form, setForm] = useState<TenantAiSettings>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof TenantAiSettings, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const fieldErrors = useMemo<FieldErrors>(() => {
    const errs: FieldErrors = {};
    (Object.keys(form) as (keyof TenantAiSettings)[]).forEach((key) => {
      if (!touched[key]) return;
      const val = form[key];
      if (val === undefined) return;
      errs[key] = validateAiField(key, String(val ?? ""));
    });
    return errs;
  }, [form, touched]);

  const formValid = tenantAiSettingsSchema.safeParse(form).success;

  const touch = useCallback((key: keyof TenantAiSettings) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setSaveOk(false);
    setTestResult(null);
  }, []);

  function update<K extends keyof TenantAiSettings>(key: K, value: TenantAiSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    touch(key);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { ai: form } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(json.error ?? "Erro ao salvar configurações de IA.");
        return;
      }
      setSaveOk(true);
    } catch {
      setSaveError("Erro de rede. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestPrompt() {
    if (!formValid) return;
    setTesting(true);
    setTestResult({ status: "running", message: "Simulando resposta do agente…" });
    try {
      const res = await apiFetch("/api/settings/ai/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestResult({
          status: "failed",
          message: json.error ?? "Falha na simulação.",
        });
        return;
      }
      setTestResult({
        status: "success",
        message: json.data?.preview ?? "Simulação concluída.",
        sampleReply: json.data?.sampleReply,
      });
    } catch {
      setTestResult({ status: "failed", message: "Erro de rede na simulação." });
    } finally {
      setTesting(false);
    }
  }

  function fieldClass(key: keyof TenantAiSettings) {
    return cn(
      touched[key] && fieldErrors[key] && "border-destructive focus-visible:ring-destructive",
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4 text-violet-600" />
          Agente de IA
        </CardTitle>
        <CardDescription>
          Personalize o escopo e o tom do assistente (ex.: agente Sara). Valide e teste antes de salvar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ai-agent-name">Nome do agente</Label>
            <Input
              id="ai-agent-name"
              value={form.agentName}
              onChange={(e) => update("agentName", e.target.value)}
              onBlur={() => touch("agentName")}
              disabled={!canEdit}
              placeholder={DEFAULT_AI_SETTINGS.agentName}
              className={fieldClass("agentName")}
            />
            {touched.agentName && fieldErrors.agentName && (
              <p className="text-xs text-destructive">{fieldErrors.agentName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Tom de voz</Label>
            <Select
              value={form.agentTone ?? "professional"}
              onValueChange={(v) => update("agentTone", v as TenantAiSettings["agentTone"])}
              disabled={!canEdit}
            >
              <SelectTrigger onBlur={() => touch("agentTone")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TONE_LABELS) as (keyof typeof TONE_LABELS)[]).map((tone) => (
                  <SelectItem key={tone} value={tone}>
                    {TONE_LABELS[tone]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-company-context">Contexto da empresa</Label>
          <Textarea
            id="ai-company-context"
            value={form.companyContext ?? ""}
            onChange={(e) => update("companyContext", e.target.value)}
            onBlur={() => touch("companyContext")}
            disabled={!canEdit}
            rows={2}
            placeholder="Segmento, produtos principais, diferenciais…"
            className={fieldClass("companyContext")}
          />
          {touched.companyContext && fieldErrors.companyContext && (
            <p className="text-xs text-destructive">{fieldErrors.companyContext}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-system-prompt">Prompt do sistema</Label>
          <Textarea
            id="ai-system-prompt"
            value={form.systemPrompt}
            onChange={(e) => update("systemPrompt", e.target.value)}
            onBlur={() => touch("systemPrompt")}
            disabled={!canEdit}
            rows={5}
            className={cn("font-mono text-xs", fieldClass("systemPrompt"))}
          />
          {touched.systemPrompt && fieldErrors.systemPrompt && (
            <p className="text-xs text-destructive">{fieldErrors.systemPrompt}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {form.systemPrompt.length}/4000 caracteres
          </p>
        </div>

        {testResult && (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              testResult.status === "running" && "border-blue-200 bg-blue-50 text-blue-900",
              testResult.status === "success" && "border-green-200 bg-green-50 text-green-900",
              testResult.status === "failed" && "border-red-200 bg-red-50 text-red-900",
            )}
          >
            <p className="flex items-center gap-2 font-medium">
              {testResult.status === "running" && <Loader2 className="h-4 w-4 animate-spin" />}
              {testResult.status === "success" && <Sparkles className="h-4 w-4" />}
              {testResult.status === "failed" && <FlaskConical className="h-4 w-4" />}
              {testResult.message}
            </p>
            {testResult.sampleReply && (
              <p className="mt-2 text-xs whitespace-pre-wrap opacity-90">
                {testResult.sampleReply}
              </p>
            )}
          </div>
        )}

        {canEdit && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestPrompt}
              disabled={!formValid || testing || saving}
              className="gap-2"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              Testar Prompt
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!formValid || saving || testing}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar agente
            </Button>
          </div>
        )}

        {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        {saveOk && <p className="text-xs text-green-600">Configurações de IA salvas.</p>}
      </CardContent>
    </Card>
  );
}
