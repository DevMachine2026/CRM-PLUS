import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Edge-compatible auth config — no Prisma, no Node.js modules.
 * Used by proxy.ts (Edge Runtime) for session checking.
 * The full config with Credentials + Prisma lives in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const publicPaths = [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/api/auth",
        "/api/webhooks",
      ];
      const isPublic = publicPaths.some((p) => pathname.startsWith(p));
      if (isPublic) return true;

      // Demo seed apenas fora de produção
      if (pathname.startsWith("/api/demo") && process.env.NODE_ENV !== "production") {
        return true;
      }

      if (auth?.user?.tenantId) return true;

      const login = new URL("/login", request.nextUrl.origin);
      login.searchParams.set("reason", "session_expired");
      if (pathname !== "/login" && !pathname.startsWith("/api/")) {
        login.searchParams.set("callbackUrl", pathname);
      }
      return NextResponse.redirect(login);
    },
  },
  providers: [],
};
