/**
 * Retry, timeout e circuit breaker para chamadas HTTP ao Evolution GO.
 */

import { evolutionLog } from "@/lib/integrations/evolution-logger";

export type FetchRetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  label?: string;
  /** HTTP status codes que disparam retry (default: 429, 502, 503, 504) */
  retryOnStatus?: number[];
};

const DEFAULT_RETRY_STATUS = [429, 502, 503, 504];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const timeoutMs = options.timeoutMs ?? 25_000;
  const retryOn = new Set(options.retryOnStatus ?? DEFAULT_RETRY_STATUS);
  const label = options.label ?? "fetch";

  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);
      if (res.ok || !retryOn.has(res.status) || i === attempts - 1) {
        return res;
      }
      evolutionLog.warn("retry", `${label}: HTTP ${res.status}, retry ${i + 1}/${attempts}`);
    } catch (err) {
      lastError = err;
      const aborted = err instanceof Error && err.name === "AbortError";
      evolutionLog.warn("retry", `${label}: ${aborted ? "timeout" : "network"}, retry ${i + 1}/${attempts}`);
      if (i === attempts - 1) throw err;
    }
    await sleep(baseDelayMs * 2 ** i);
  }

  throw lastError instanceof Error ? lastError : new Error(`${label}: request failed`);
}

// ── Circuit breaker (por instância Node / warm serverless) ───────────────────

type CircuitState = "closed" | "open" | "half-open";

type CircuitBucket = {
  state: CircuitState;
  failures: number;
  openedAt?: number;
};

const CIRCUIT_KEY = "__crm_evolution_circuit__";
const FAILURE_THRESHOLD = 5;
const OPEN_MS = 60_000;

function getCircuit(): CircuitBucket {
  const g = globalThis as typeof globalThis & { [CIRCUIT_KEY]?: CircuitBucket };
  if (!g[CIRCUIT_KEY]) {
    g[CIRCUIT_KEY] = { state: "closed", failures: 0 };
  }
  return g[CIRCUIT_KEY];
}

export class EvolutionCircuitOpenError extends Error {
  constructor() {
    super("Evolution GO circuit open — chamadas temporariamente bloqueadas.");
    this.name = "EvolutionCircuitOpenError";
  }
}

export async function fetchEvolutionGo(
  url: string,
  init: RequestInit,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const circuit = getCircuit();
  const now = Date.now();

  if (circuit.state === "open") {
    if (circuit.openedAt && now - circuit.openedAt < OPEN_MS) {
      throw new EvolutionCircuitOpenError();
    }
    circuit.state = "half-open";
    evolutionLog.info("circuit", "half-open — tentando recuperação");
  }

  try {
    const res = await fetchWithRetry(url, init, options);
    circuit.state = "closed";
    circuit.failures = 0;
    return res;
  } catch (err) {
    circuit.failures += 1;
    if (circuit.failures >= FAILURE_THRESHOLD) {
      circuit.state = "open";
      circuit.openedAt = now;
      evolutionLog.error("circuit", "aberto após falhas consecutivas", {
        failures: circuit.failures,
      });
    }
    throw err;
  }
}

export function getCircuitStatus(): { state: CircuitState; failures: number } {
  const c = getCircuit();
  return { state: c.state, failures: c.failures };
}
