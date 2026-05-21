import { cn } from "@/lib/utils";

/** Campo de formulário com largura limitada ao container (evita overflow em grids). */
export function FormField({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("min-w-0 space-y-1.5", className)}>{children}</div>;
}

/**
 * Duas colunas em telas ≥ sm; filhos devem usar FormField ou min-w-0.
 * Em drawers estreitos, empilha em uma coluna.
 */
export function FormFieldRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
