/**
 * Valida variáveis Meta/Instagram antes de conectar.
 * Uso: npm run check:meta
 */

import { config } from "dotenv";
import { resolve } from "path";
import { getMetaInstagramReadiness } from "../lib/integrations/meta-instagram-readiness";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const readiness = getMetaInstagramReadiness(
  process.env.NEXTAUTH_URL ?? "",
);

console.log("\n── CRM PLUS · Check Meta/Instagram ──\n");
console.log(`Modo: ${readiness.mode === "ready" ? "pronto para OAuth" : "demonstração"}`);
console.log(`OAuth: ${readiness.readyForOAuth ? "OK" : "pendente"}`);
console.log(`Webhooks produção: ${readiness.readyForProductionWebhooks ? "OK" : "pendente"}\n`);

if (readiness.oauthRedirectUri) {
  console.log("Redirect URI (cadastrar no Meta):");
  console.log(`  ${readiness.oauthRedirectUri}\n`);
}

if (readiness.webhookUrl) {
  console.log("Webhook Instagram (cadastrar no Meta):");
  console.log(`  ${readiness.webhookUrl}\n`);
}

let hasMissing = false;
for (const item of readiness.items) {
  const mark =
    item.status === "ok"
      ? "✓"
      : item.status === "optional"
        ? "○"
        : item.status === "info"
          ? "→"
          : "✗";
  if (item.status === "missing") hasMissing = true;
  const extra = item.displayValue ? ` (${item.displayValue})` : "";
  console.log(`  ${mark} ${item.label}${extra}`);
}

console.log("");
if (!readiness.readyForOAuth) {
  console.log("Preencha .env.meta.template → copie para .env.local → reinicie o dev server.");
  console.log("Guia: docs/META-INSTAGRAM-HANDOFF.md\n");
  process.exit(1);
}

console.log("Pronto. Abra Integrações → Instagram → Continuar com Facebook.\n");
