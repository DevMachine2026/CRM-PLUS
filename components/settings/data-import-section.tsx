"use client";

import { useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  Users,
  Package,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client-fetch";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ImportPreview, ImportResult } from "@/lib/import/types";

type Props = {
  canImportContacts: boolean;
  canImportProducts: boolean;
};

function ImportBlock({
  title,
  description,
  templatePath,
  previewPath,
  importPath,
  icon,
  disabled,
}: {
  title: string;
  description: string;
  templatePath: string;
  previewPath: string;
  importPath: string;
  icon: React.ReactNode;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [step, setStep] = useState<"idle" | "preview" | "done">("idle");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setStep("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function runPreview(selected: File) {
    setLoading(true);
    setError(null);
    setPreview(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", selected);
    try {
      const res = await apiFetch(previewPath, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha na pré-visualização.");
      setPreview(json.data as ImportPreview);
      setStep("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro na pré-visualização.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("updateExisting", String(updateExisting));
    try {
      const res = await apiFetch(importPath, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha na importação.");
      setResult(json.data as ImportResult);
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro na importação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      {step === "idle" && (
        <>
          <div className="flex flex-wrap gap-2">
            <Link
              href={templatePath}
              download
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
            >
              <Download className="h-4 w-4" />
              Modelo CSV
            </Link>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={disabled || loading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  void runPreview(f);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={disabled || loading}
              onClick={() => inputRef.current?.click()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              1. Enviar e revisar
            </Button>
          </div>
        </>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4 rounded-lg border bg-background p-4">
          <p className="text-sm font-medium">Pré-visualização (sem gravar ainda)</p>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-xs text-muted-foreground">Linhas</p>
              <p className="font-semibold">{preview.totalRows}</p>
            </div>
            <div className="rounded-md bg-green-50 p-2">
              <p className="text-xs text-muted-foreground">Novos</p>
              <p className="font-semibold text-green-800">{preview.wouldCreate}</p>
            </div>
            <div className="rounded-md bg-blue-50 p-2">
              <p className="text-xs text-muted-foreground">Atualizar</p>
              <p className="font-semibold text-blue-800">{preview.wouldUpdate}</p>
            </div>
            <div className="rounded-md bg-amber-50 p-2">
              <p className="text-xs text-muted-foreground">Erros</p>
              <p className="font-semibold text-amber-900">{preview.errorCount}</p>
            </div>
          </div>

          {preview.detectedColumns.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Colunas detectadas: {preview.detectedColumns.slice(0, 8).join(", ")}
              {preview.detectedColumns.length > 8 ? "…" : ""}
            </p>
          )}

          <ul className="text-xs space-y-1 max-h-28 overflow-y-auto">
            {preview.samples.map((s) => (
              <li key={`${s.row}-${s.label}`}>
                Linha {s.row}: {s.label} → {s.action}
                {s.message ? ` (${s.message})` : ""}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Switch
              checked={updateExisting}
              onCheckedChange={setUpdateExisting}
            />
            <Label className="text-sm font-normal">
              Atualizar duplicados (e-mail, telefone ou ID externo)
            </Label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              disabled={loading || preview.validRows === 0}
              onClick={() => void confirmImport()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              2. Confirmar importação
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 space-y-2">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Importação concluída
          </p>
          <p>
            {result.created} criados · {result.updated} atualizados · {result.skipped}{" "}
            ignorados
          </p>
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            Importar outro arquivo
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function DataImportSection({
  canImportContacts,
  canImportProducts,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Migrar de outro CRM
        </CardTitle>
        <CardDescription>
          Fluxo em 2 passos: revisar o arquivo, depois confirmar. Compatível com
          exportações do HubSpot, Pipedrive, RD Station, planilhas Excel (CSV) e
          outros.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
          <li>Exporte do CRM antigo em CSV (no Excel: Salvar como CSV UTF-8).</li>
          <li>Baixe nosso modelo ou use seu arquivo — mapeamos colunas automaticamente.</li>
          <li>Revise a pré-visualização e só então confirme a importação.</li>
        </ol>

        <ImportBlock
          title="Contatos"
          description="Reconhece nome, e-mail, telefone, empresa, status e ID do CRM anterior."
          templatePath="/api/import/template/contacts"
          previewPath="/api/import/contacts/preview"
          importPath="/api/import/contacts"
          icon={<Users className="h-5 w-5" />}
          disabled={!canImportContacts}
        />

        <ImportBlock
          title="Produtos"
          description="Reconhece nome, preço (R$ 1.490,00 ou 1490.00), categoria e status."
          templatePath="/api/import/template/products"
          previewPath="/api/import/products/preview"
          importPath="/api/import/products"
          icon={<Package className="h-5 w-5" />}
          disabled={!canImportProducts}
        />

        <p className="text-xs text-muted-foreground">
          Dica: inclua a coluna <code className="text-foreground">external_id</code> com
          o ID do CRM antigo para evitar duplicados em reimportações.
        </p>
      </CardContent>
    </Card>
  );
}
