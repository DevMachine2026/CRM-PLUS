"use client";

/** Client fetch: trata 401/403 sem tela branca (use em *-client.tsx via apiFetch). */
export function handleApiAuthResponse(res: Response): boolean {
  if (typeof window === "undefined") return false;
  if (res.status === 401) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?reason=session_expired&callbackUrl=${next}`;
    return true;
  }
  if (res.status === 403) {
    window.location.href = "/dashboard?reason=forbidden";
    return true;
  }
  return false;
}
