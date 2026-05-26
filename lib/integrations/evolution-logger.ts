type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  const payload = meta ? { scope, ...meta } : { scope };
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[evolution/${scope}] ${message}`, payload);
}

export const evolutionLog = {
  info: (scope: string, message: string, meta?: Record<string, unknown>) =>
    log("info", scope, message, meta),
  warn: (scope: string, message: string, meta?: Record<string, unknown>) =>
    log("warn", scope, message, meta),
  error: (scope: string, message: string, meta?: Record<string, unknown>) =>
    log("error", scope, message, meta),
};
