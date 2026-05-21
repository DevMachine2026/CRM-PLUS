import type { LoginErrorKey } from "./resolve-login-error";

const MESSAGES: Record<LoginErrorKey, string> = {
  InvalidCredentials: "E-mail ou senha incorretos.",
  DatabaseUnavailable:
    "Não foi possível conectar ao banco de dados. No desenvolvimento local, use um Postgres acessível (veja .env.local.example) — a URL do Render (dpg-...) costuma falhar fora do servidor.",
  DemoUnavailable: "Conta demo indisponível no momento. Tente novamente.",
  Configuration:
    "Erro de configuração do servidor (AUTH_SECRET / NEXTAUTH_URL).",
};

export function loginErrorMessage(key: LoginErrorKey | null): string | null {
  if (!key) return null;
  return MESSAGES[key];
}
