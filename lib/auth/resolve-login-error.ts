import { AuthError, CredentialsSignin } from "next-auth";
import { isDbConnectionError } from "./is-db-connection-error";

export function isDatabaseUnavailableError(err: unknown): boolean {
  if (isDbConnectionError(err)) return true;
  if (err instanceof CredentialsSignin && err.code === "database_unavailable") {
    return true;
  }
  if (err instanceof AuthError) {
    if (isDatabaseUnavailableError(err.cause)) return true;
  }
  if (err instanceof Error && err.message === "DatabaseUnavailable") {
    return true;
  }
  return false;
}

export type LoginErrorKey =
  | "InvalidCredentials"
  | "DatabaseUnavailable"
  | "DemoUnavailable"
  | "Configuration";

export function loginErrorFromQuery(
  error: string | undefined,
  code: string | undefined,
): LoginErrorKey | null {
  if (code === "database_unavailable" || error === "DatabaseUnavailable") {
    return "DatabaseUnavailable";
  }
  if (error === "DemoUnavailable") return "DemoUnavailable";
  if (error === "Configuration") return "Configuration";
  if (error === "InvalidCredentials" || error === "CredentialsSignin") {
    return "InvalidCredentials";
  }
  return error ? "InvalidCredentials" : null;
}
