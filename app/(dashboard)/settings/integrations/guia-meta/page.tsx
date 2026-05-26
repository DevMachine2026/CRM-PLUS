import Link from "next/link";
import { requirePageSession, requirePagePermission } from "@/lib/auth/get-session";
import { getMetaInstagramReadiness } from "@/lib/integrations/meta-instagram-readiness";
import { MetaInstagramReadinessPanel } from "@/components/integrations/meta-instagram-readiness-panel";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Guia Instagram (Meta) — CRM PLUS" };

export default async function GuiaMetaPage() {
  const session = await requirePageSession();
  requirePagePermission(session, "read", "integrations", "/settings?reason=forbidden");

  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const readiness = getMetaInstagramReadiness(baseUrl);

  return (
    <div className={cn(ds.pageStack, ds.pagePx, ds.pagePy, "max-w-2xl")}>
      <PageHeader
        title="Guia Instagram (Meta)"
        description="Checklist para quando o contratante enviar App ID e App Secret."
        icon={
          <Link
            href="/settings/integrations"
            aria-label="Voltar para integrações"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      <MetaInstagramReadinessPanel readiness={readiness} forceShow />

      <article className="prose prose-sm max-w-none text-foreground">
        <h2 className="text-lg font-semibold">1. Pedir ao contratante</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">META_APP_ID</strong> — ID do aplicativo
          </li>
          <li>
            <strong className="text-foreground">META_APP_SECRET</strong> — chave secreta do app
          </li>
          <li>
            Conta Instagram <strong>profissional</strong> vinculada a uma{" "}
            <strong>Página do Facebook</strong>
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">2. Colar no servidor</h2>
        <p className="text-sm text-muted-foreground">
          Use o arquivo <code className="text-xs">.env.meta.template</code> na raiz do projeto.
          Copie as linhas preenchidas para <code className="text-xs">.env.local</code> (dev) ou
          variáveis da Vercel (produção). Depois execute{" "}
          <code className="text-xs">npm run check:meta</code>.
        </p>

        <h2 className="mt-6 text-lg font-semibold">3. Contratante cadastra no app Meta</h2>
        <p className="text-sm text-muted-foreground">
          Os URLs exatos estão no painel acima (Redirect OAuth e Webhook). Documentação
          completa em <code className="text-xs">docs/META-INSTAGRAM-HANDOFF.md</code> no
          repositório — inclui modelo de e-mail para enviar ao cliente.
        </p>

        <h2 className="mt-6 text-lg font-semibold">4. Conectar no CRM</h2>
        <p className="text-sm text-muted-foreground">
          Integrações → Instagram → <strong>Continuar com Facebook</strong> → escolher a
          página → Conectar.
        </p>
      </article>
    </div>
  );
}
