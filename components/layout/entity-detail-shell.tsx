import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type EntityDetailShellProps = {
  backHref: string;
  backLabel: string;
  title: string;
  meta?: React.ReactNode;
  /** Ícone ou avatar à esquerda do título */
  leading?: React.ReactNode;
  aside?: React.ReactNode;
  /** Botões abaixo do cabeçalho (ex.: imprimir, editar) */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Layout padrão para páginas de detalhe (`/[id]`). */
export function EntityDetailShell({
  backHref,
  backLabel,
  title,
  meta,
  leading,
  aside,
  actions,
  children,
  className,
}: EntityDetailShellProps) {
  return (
    <div className={cn(ds.pageStack, "mx-auto w-full max-w-5xl", className)}>
      <Link href={backHref} className="inline-flex">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {meta ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {meta}
              </div>
            ) : null}
          </div>
        </div>
        {aside ? <div className="shrink-0 text-right">{aside}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      {children}
    </div>
  );
}
