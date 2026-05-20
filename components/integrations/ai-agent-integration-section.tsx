"use client";

import { useState } from "react";
import { Bot, Loader2, Save, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api/client-fetch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ds } from "@/lib/design-system";
import {
  DEFAULT_AI_SETTINGS,
  type TenantAiSettings,
} from "@/lib/ai/tenant-settings";

type Props = {
  initial: TenantAiSettings;
  canEdit: boolean;
};

export function AiAgentIntegrationSection({ initial, canEdit }: Props) {
  const [aiEnabled, setAiEnabled] = useState(initial.aiEnabled ?? false);
  const [instructions, setInstructions] = useState(initial.systemPrompt ?? DEFAULT_AI_SETTINGS.systemPrompt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload: TenantAiSettings = {
        ...initial,
        aiEnabled,
        systemPrompt: instructions.trim() || DEFAULT_AI_SETTINGS.systemPrompt,
        agentName: initial.agentName ?? DEFAULT_AI_SETTINGS.agentName,
        agentTone: initial.agentTone ?? DEFAULT_AI_SETTINGS.agentTone,
      };
      const res = await apiFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { ai: payload } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível salvar.");
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={cn(ds.listCard, "space-y-5")}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100">
          <Bot className="h-5 w-5 text-violet-700" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight">Agente de Inteligência Artificial</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ative a Sara para qualificar leads automaticamente nos canais conectados.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 px-4 py-3">
        <Label htmlFor="ai-native-toggle" className="cursor-pointer text-sm font-medium">
          Ativar IA Nativa
        </Label>
        <Switch
          id="ai-native-toggle"
          checked={aiEnabled}
          onCheckedChange={setAiEnabled}
          disabled={!canEdit}
        />
      </div>

      {aiEnabled && (
        <div className="space-y-3 animate-in fade-in-0 duration-200">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <span aria-hidden>🟢</span>
            <span className="font-medium">IA Ativa e Qualificando Leads</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-instructions" className="text-sm">
              Instruções e Escopo da Agente
            </Label>
            <Textarea
              id="agent-instructions"
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                setSaved(false);
              }}
              disabled={!canEdit}
              rows={5}
              placeholder="Você é a Sara, assistente da concessionária X. Seu objetivo é agendar um horário…"
              className="resize-none rounded-xl border-border/80 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Descreva tom, objetivos e o que a agente pode ou não fazer.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || (aiEnabled && instructions.trim().length < 20)}
            className={cn("gap-2", ds.primaryAction)}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Salvo" : "Salvar agente"}
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </section>
  );
}
