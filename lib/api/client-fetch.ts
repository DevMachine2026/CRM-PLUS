"use client";

import { handleApiAuthResponse } from "@/lib/auth/handle-api-auth-response";

/** Disparado quando a sessão expirou ou o usuário não tem permissão (redirect em andamento). */
export class ApiAuthRedirectError extends Error {
  constructor() {
    super("auth_redirect");
    this.name = "ApiAuthRedirectError";
  }
}

/** fetch com redirect automático em 401/403. */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (handleApiAuthResponse(res)) throw new ApiAuthRedirectError();
  return res;
}
