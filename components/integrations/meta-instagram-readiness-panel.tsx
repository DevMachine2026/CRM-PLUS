"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Circle, Copy, ExternalLink, FileText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  MetaInstagramReadiness,
  MetaReadinessItem,
  ReadinessStatus,
} from "@/lib/integrations/meta-instagram-readiness";

type Props = {
  readiness?: MetaInstagramReadiness | null;
  /** Exibe o painel mesmo quando tudo está OK (página de guia). */
  forceShow?: boolean;
};

const FALLBACK_READINESS: MetaInstagramReadiness = {
  mode: "demo",
  readyForOAuth: false,
  readyForProductionWebhooks: false,
  oauthRedirectUri: "",
  webhookUrl: "",
  items: [],
};

function StatusIcon({ status }: { status: ReadinessStatus }) {
  if (status === "ok") {
    return <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden />;
  }
  if (status === "info") {
    return <Circle className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />;
  }
  if (status === "optional") {
    return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
  }
  return (
    <Circle
      className="h-4 w-4 shrink-0 text-amber-500"
      aria-hidden
    />
  );
}

function CopyableValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-1 flex items-start gap-2">
      <code className="block flex-1 break-all rounded bg-muted/60 px-2 py-1 text-[11px]">
        {value}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label="Copiar"
        onClick={() => void copy()}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      {copied && (
        <span className="text-[10px] text-muted-foreground">Copiado</span>
      )}
    </div>
  );
}

function ReadinessRow({ item }: { item: MetaReadinessItem }) {
  const copyable =
    item.status === "info" &&
    item.displayValue &&
    (item.id === "oauth_redirect" || item.id === "webhook_url");

  return (
    <li className="flex gap-3 border-b border-border/50 py-3 last:border-0">
      <StatusIcon status={item.status} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
        {item.displayValue && !copyable && (
          <p className="mt-1 font-mono text-xs text-foreground/80">
            {item.displayValue}
          </p>
        )}
        {copyable && <CopyableValue value={item.displayValue!} />}
      </div>
    </li>
  );
}

export function MetaInstagramReadinessPanel({
  readiness: readinessProp,
  forceShow,
}: Props) {
  const readiness = readinessProp ?? FALLBACK_READINESS;

  if (
    !forceShow &&
    readiness?.mode === "ready" &&
    readiness.readyForProductionWebhooks
  ) {
    return null;
  }

  const pendingCount =
    readiness?.items?.filter((i) => i.status === "missing").length ?? 0;

  return (
    <section
      className={cn(
        "rounded-xl border px-4 py-4",
        readiness?.mode === "demo"
          ? "border-amber-200/80 bg-amber-50/40"
          : "border-border bg-muted/20",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold tracking-tight">
            Preparação Instagram (Meta)
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {readiness?.mode === "demo"
              ? "Aguardando credenciais do contratante. Enquanto isso, o CRM usa modo demonstração."
              : "Credenciais no servidor detectadas. Confira os URLs abaixo no painel Meta e conecte a página."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/integrations/guia-meta"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <FileText className="h-3.5 w-3.5" />
            Guia completo
          </Link>
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Meta Developers
          </a>
        </div>
      </div>

      {pendingCount > 0 && (
        <p className="mt-3 text-xs font-medium text-amber-900/90">
          Faltam {pendingCount} variável(is) de ambiente — veja{" "}
          <code className="text-[11px]">.env.meta.template</code> na raiz do projeto.
        </p>
      )}

      <ul className="mt-3">
        {(readiness?.items ?? []).map((item) => (
          <ReadinessRow key={item.id} item={item} />
        ))}
      </ul>

      {readiness?.mode === "ready" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Próximo passo: Integrações → Instagram →{" "}
          <strong>Continuar com Facebook</strong> (conta admin da Página + Instagram
          Business).
        </p>
      )}
    </section>
  );
}
