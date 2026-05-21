/** Erros de rede/DNS ao conectar no Postgres (comum em dev offline ou URL Render inválida). */
export function isDbConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";

  if (
    message.includes("EAI_AGAIN") ||
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Can't reach database server") ||
    code === "P1001"
  ) {
    return true;
  }

  if ("cause" in error && error.cause) {
    return isDbConnectionError(error.cause);
  }

  return false;
}
