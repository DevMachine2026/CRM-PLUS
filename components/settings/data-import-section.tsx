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

type ImportStats = {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

type Props = {
  canImportContacts: boolean;
  canImportProducts: boolean;
};

function ImportBlock({
  title,
  description,
  templatePath,
  uploadPath,
  icon,
  disabled,
}: {
  title: string;
  description: string;
  templatePath: string;
  uploadPath: string;
  icon: React.ReactNode;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("updateExisting", String(updateExisting));
    try {
      const res = await apiFetch(uploadPath, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha na importação.");
      setResult(json.data as ImportStats);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro na importação.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
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

      <div className="flex flex-wrap gap-2">
        <Link
          href={templatePath}
          download
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
        >
          <Download className="h-4 w-4" />
          Baixar modelo CSV
        </Link>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={disabled || loading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={disabled || loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Enviar CSV
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id={`update-${uploadPath}`}
          checked={updateExisting}
          onCheckedChange={setUpdateExisting}
          disabled={disabled}
        />
        <Label htmlFor={`update-${uploadPath}`} className="text-sm font-normal">
          Atualizar registros existentes (mesmo e-mail, telefone ou nome)
        </Label>
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 space-y-1">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Importação concluída
          </p>
          <p>
            {result.created} criados · {result.updated} atualizados ·{" "}
            {result.skipped} ignorados
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-32 overflow-y-auto text-xs list-disc pl-4">
              {result.errors.slice(0, 8).map((err) => (
                <li key={`${err.row}-${err.message}`}>
                  Linha {err.row}: {err.message}
                </li>
              ))}
              {result.errors.length > 8 && (
                <li>… e mais {result.errors.length - 8} avisos</li>
              )}
            </ul>
          )}
        </div>
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
          Exporte contatos ou produtos do CRM antigo em CSV e importe aqui em poucos
          cliques. Aceita vírgula ou ponto-e-vírgula (Excel brasileiro).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
          <li>No CRM antigo: exportar lista em CSV ou Excel → salvar como CSV.</li>
          <li>Baixe nosso modelo e alinhe as colunas (ou renomeie no seu arquivo).</li>
          <li>Envie o arquivo abaixo e confira o resumo.</li>
        </ol>

        <ImportBlock
          title="Contatos"
          description="Colunas: nome, email, telefone, empresa, status (lead/customer/inactive)."
          templatePath="/api/import/template/contacts"
          uploadPath="/api/import/contacts"
          icon={<Users className="h-5 w-5" />}
          disabled={!canImportContacts}
        />

        <ImportBlock
          title="Produtos"
          description="Colunas: nome, preco, categoria, descricao, status (active/inactive)."
          templatePath="/api/import/template/products"
          uploadPath="/api/import/products"
          icon={<Package className="h-5 w-5" />}
          disabled={!canImportProducts}
        />
      </CardContent>
    </Card>
  );
}
