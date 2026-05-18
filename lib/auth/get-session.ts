import { auth } from "./auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { can, type Action, type Resource } from "./permissions";

export interface SessionUser {
  id: string;
  tenantId: string;
  tenantSlug: string;
  role: UserRole;
  name?: string | null;
  email?: string | null;
}

export type AuthErrorCode = "UNAUTHORIZED" | "FORBIDDEN";

/** Cláusula Prisma obrigatória em mutações por ID — nunca confie só no `id`. */
export function tenantWhere(session: SessionUser, id: string) {
  return { id, tenantId: session.tenantId } as const;
}

/**
 * Extrai sessão autenticada. `tenantId` vem SOMENTE do JWT/sessão Auth.js —
 * nunca de query, body ou headers do cliente.
 */
export async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) return null;
  return session.user as SessionUser;
}

export function unauthorized(message = "Não autorizado.") {
  return NextResponse.json(
    { error: message, code: "UNAUTHORIZED" as const },
    { status: 401 }
  );
}

export function forbidden(message = "Sem permissão para esta ação.") {
  return NextResponse.json(
    { error: message, code: "FORBIDDEN" as const },
    { status: 403 }
  );
}

type SessionResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

/** Para Route Handlers: sessão válida ou resposta JSON 401. */
export async function requireSession(): Promise<SessionResult> {
  const session = await getSession();
  if (!session) return { ok: false, response: unauthorized() };
  return { ok: true, session };
}

/** Sessão + RBAC ou 401/403 JSON padronizado. */
export async function requirePermission(
  action: Action,
  resource: Resource
): Promise<SessionResult> {
  const result = await requireSession();
  if (!result.ok) return result;
  if (!can(result.session.role, action, resource)) {
    return { ok: false, response: forbidden() };
  }
  return result;
}

/** Server Components / páginas: redireciona com motivo legível na URL. */
export async function requirePageSession(
  loginPath = "/login"
): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect(`${loginPath}?reason=session_expired`);
  }
  return session;
}

export function requirePagePermission(
  session: SessionUser,
  action: Action,
  resource: Resource,
  fallbackPath = "/dashboard?reason=forbidden"
): void {
  if (!can(session.role, action, resource)) {
    redirect(fallbackPath);
  }
}

/** Client fetch: trata 401/403 sem tela branca (use em *-client.tsx). */
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
