import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function readToken(headers: Headers, queryToken: string | null): string | null {
  return (
    headers.get("client-token") ??
    headers.get("x-zapi-token") ??
    headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    queryToken
  );
}

export function verifyZapiWebhookAuth(params: {
  headers: Headers;
  queryToken: string | null;
  tokenFromIntegration?: string;
}): { ok: true; method: "integration_token" | "env_token" | "dev_skip" } | { ok: false } {
  const incoming = readToken(params.headers, params.queryToken);
  const fromIntegration = params.tokenFromIntegration?.trim();
  if (incoming && fromIntegration && safeEqual(incoming, fromIntegration)) {
    return { ok: true, method: "integration_token" };
  }

  const envToken = process.env.ZAPI_WEBHOOK_TOKEN?.trim();
  if (incoming && envToken && safeEqual(incoming, envToken)) {
    return { ok: true, method: "env_token" };
  }

  // Em dev local permitimos sem token explícito para facilitar smoke tests.
  if (process.env.NODE_ENV !== "production" && !envToken && !fromIntegration) {
    return { ok: true, method: "dev_skip" };
  }

  return { ok: false };
}
