# Password Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete forgot-password / reset-password flow so users can recover their accounts via email.

**Architecture:** `PasswordResetToken` model already exists in the schema (table `password_reset_tokens`). The flow is: request form → POST API creates token + sends email via Resend → reset form reads token from URL → POST API validates + updates `passwordHash`. Login page gains a "Esqueceu a senha?" link and shows a success banner after reset.

**Tech Stack:** Next.js 16 App Router, NextAuth v5, Prisma 7, bcryptjs, Resend (npm package), Zod

---

## IMPORTANT: Read before touching any file

- AGENTS.md says: **"Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."**
  Run: `ls node_modules/next/dist/docs/` and read any file about App Router pages or Server/Client Components if unsure.
- All imports use the `@/` alias — never use relative paths like `../../lib/...`.
- `getSession()` returns `SessionUser | null`. For API routes use `getSession()` + `unauthorized()` / `forbidden()` from `@/lib/auth/get-session`.
- For **pages**, use `auth()` from `@/lib/auth/auth` + `redirect()` from `next/navigation`.
- Prisma client: always `import { prisma } from "@/lib/db/client"` — never `new PrismaClient()`.
- `UserRole` type: `import type { UserRole } from "@/lib/generated/prisma/enums"`.

---

## File Map

| Action | Path |
|--------|------|
| Create | `lib/email/send.ts` |
| Create | `app/api/auth/forgot-password/route.ts` |
| Create | `app/api/auth/reset-password/route.ts` |
| Create | `app/(auth)/forgot-password/page.tsx` |
| Create | `app/(auth)/reset-password/page.tsx` (Server Component wrapper) |
| Create | `app/(auth)/reset-password/reset-password-form.tsx` (Client Component) |
| Modify | `app/(auth)/login/page.tsx` — add forgot-password link + reset success banner |

---

## Task 1: Install Resend and create email helper

**Files:**
- Modify: `package.json` (via npm install)
- Create: `lib/email/send.ts`

- [ ] **Step 1: Install the resend package**

```bash
cd /mnt/hd/CRM-PLUS
npm install resend
```

Expected: `resend` appears in `package.json` dependencies.

- [ ] **Step 2: Add env vars to `.env.local`**

Open `.env.local` and add at the end:

```
# ── Email (Resend) ────────────────────────────────────────────────────────────
RESEND_API_KEY=""
RESEND_FROM_EMAIL="CRM PLUS <noreply@resend.dev>"
```

> For dev/testing: leave `RESEND_API_KEY` empty — emails will be logged to console instead of sent.
> For production: set a real key from resend.com and a verified sender domain.
> The `noreply@resend.dev` from-address only works for sending to the account owner's email on Resend's free tier.

- [ ] **Step 3: Create `lib/email/send.ts`**

```typescript
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? "CRM PLUS <noreply@resend.dev>";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send:", payload.subject, "→", payload.to);
    return;
  }
  const { error } = await resend.emails.send({
    from:    FROM,
    to:      payload.to,
    subject: payload.subject,
    html:    payload.html,
  });
  if (error) throw new Error(`[email] Resend error: ${error.message}`);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /mnt/hd/CRM-PLUS
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors for the new file. Fix any type errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add lib/email/send.ts package.json package-lock.json
git commit -m "feat: add Resend email helper (no-op when key not set)"
```

---

## Task 2: Create forgot-password API route

**Files:**
- Create: `app/api/auth/forgot-password/route.ts`

- [ ] **Step 1: Verify the `password_reset_tokens` table exists**

```bash
cd /mnt/hd/CRM-PLUS
npx prisma db push --accept-data-loss 2>&1 | tail -5
```

Expected: "Your database is now in sync with your Prisma schema" (table already existed).

- [ ] **Step 2: Test that the endpoint returns 404 before implementation**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"test@test.com"}'
```

Expected: `404` (route doesn't exist yet).

- [ ] **Step 3: Create `app/api/auth/forgot-password/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/send";
import { checkRateLimit } from "@/lib/rate-limit";

const FORGOT_LIMIT = { prefix: "forgot", windowMs: 300_000, max: 3 };
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const schema = z.object({ email: z.string().email() });

// Always return this response — never reveal whether email exists
const OK_RESPONSE = {
  message: "Se uma conta com este e-mail existir, um link de redefinição foi enviado.",
};

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, FORGOT_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findFirst({
      where:  { email, isActive: true },
      select: { id: true, tenantId: true, name: true },
    });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          userId:    user.id,
          tenantId:  user.tenantId,
          token,
          expiresAt: new Date(Date.now() + EXPIRY_MS),
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendEmail({
        to:      email,
        subject: "Redefinição de senha — CRM PLUS",
        html: `
          <p>Olá, ${user.name}!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>CRM PLUS</strong>.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;">
              Redefinir minha senha
            </a>
          </p>
          <p style="color:#6b7280;font-size:12px;">O link expira em 1 hora. Se você não solicitou isso, ignore este e-mail.</p>
          <p style="color:#6b7280;font-size:12px;">Ou copie o link: ${resetUrl}</p>
        `,
      });
    }
  } catch (err) {
    console.error("[forgot-password] error:", err);
    // Still return 200 — don't leak internals
  }

  return NextResponse.json(OK_RESPONSE, { status: 200 });
}
```

- [ ] **Step 4: Verify endpoint responds correctly**

Start the dev server if not running: `npm run dev`

```bash
# Should return 200 with the OK message (even for non-existent email)
curl -s -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"naoexiste@test.com"}' | jq .
```

Expected:
```json
{"message": "Se uma conta com este e-mail existir, um link de redefinição foi enviado."}
```

```bash
# Should return 400 for invalid email
curl -s -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail"}' | jq .
```

Expected: `{"error": "E-mail inválido."}`

- [ ] **Step 5: Test with real account (check console for token)**

```bash
# Use the seeded admin account
curl -s -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com.br"}' | jq .
```

Expected: 200 OK. Check the Next.js server console — it will log:
`[email] RESEND_API_KEY not set — skipping send: Redefinição de senha — CRM PLUS → admin@acme.com.br`

Also check the DB to confirm the token was created:
```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  npx prisma studio
```

Open http://localhost:5555, navigate to `PasswordResetToken` table, confirm a row exists.

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/forgot-password/route.ts
git commit -m "feat: add forgot-password API — creates token, sends email via Resend"
```

---

## Task 3: Create reset-password API route

**Files:**
- Create: `app/api/auth/reset-password/route.ts`

- [ ] **Step 1: Test that endpoint returns 404 before implementation**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" -d '{}'
```

Expected: `404`

- [ ] **Step 2: Create `app/api/auth/reset-password/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/client";

const schema = z.object({
  token:    z.string().length(64),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where:  { token },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 400 });
  }
  if (resetToken.usedAt) {
    return NextResponse.json({ error: "Token já utilizado." }, { status: 400 });
  }
  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token expirado. Solicite um novo link." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data:  { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data:  { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Senha redefinida com sucesso." }, { status: 200 });
}
```

- [ ] **Step 3: Verify invalid token returns 400**

```bash
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","password":"novaSenha123"}' | jq .
```

Expected: `{"error": "Token inválido ou expirado."}`

- [ ] **Step 4: Test with a real token from Step 4 of Task 2**

Get the token from Prisma Studio (or query):
```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  npx prisma studio
```

Copy the `token` value from the `PasswordResetToken` table, then:
```bash
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"PASTE_TOKEN_HERE\",\"password\":\"novaSenha123\"}" | jq .
```

Expected: `{"message": "Senha redefinida com sucesso."}`

Verify the `usedAt` field is now set in the DB.

Try using the same token again — expected: `{"error": "Token já utilizado."}`

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/reset-password/route.ts
git commit -m "feat: add reset-password API — validates token, updates password hash"
```

---

## Task 4: Create forgot-password page

**Files:**
- Create: `app/(auth)/forgot-password/page.tsx`

This is a Client Component (like `register/page.tsx`) — needs `useState` for error/loading/sent states.

- [ ] **Step 1: Create `app/(auth)/forgot-password/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const email = new FormData(e.currentTarget).get("email") as string;

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data.error as string) ?? "Erro ao enviar. Tente novamente.");
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">CRM PLUS</h1>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Redefinir senha</CardTitle>
            <CardDescription>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  Se uma conta com este e-mail existir, um link foi enviado.
                  Verifique sua caixa de entrada (e a pasta de spam).
                </div>
                <a
                  href="/login"
                  className="block text-center text-sm text-primary hover:underline"
                >
                  Voltar ao login
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="voce@empresa.com"
                    required
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link de redefinição
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  <a href="/login" className="hover:text-primary hover:underline">
                    Voltar ao login
                  </a>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Open http://localhost:3000/forgot-password — should show the form with email field and submit button.

- [ ] **Step 3: Test the happy path in browser**

1. Enter `admin@acme.com.br` and click "Enviar link de redefinição"
2. Page should switch to the green success message
3. Check Next.js console for the `[email] RESEND_API_KEY not set — skipping send:` log

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/forgot-password/page.tsx
git commit -m "feat: add forgot-password page"
```

---

## Task 5: Create reset-password page

**Files:**
- Create: `app/(auth)/reset-password/page.tsx` — Server Component, reads `searchParams`
- Create: `app/(auth)/reset-password/reset-password-form.tsx` — Client Component with form

The page is split into two files because:
1. `searchParams` is a Promise in Next.js 16 — must be `await`ed in a Server Component
2. The form needs `useState` — must be a Client Component

- [ ] **Step 1: Create `app/(auth)/reset-password/reset-password-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props { token: string }

export function ResetPasswordForm({ token }: Props) {
  const router               = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Link inválido.{" "}
              <a href="/forgot-password" className="text-primary hover:underline">
                Solicitar novo link
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd       = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm  = fd.get("confirm") as string;

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        router.push("/login?reset=true");
      } else {
        setError((data.error as string) ?? "Erro ao redefinir senha.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">CRM PLUS</h1>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Nova senha</CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo. Mínimo 8 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  placeholder="Repita a nova senha"
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(auth)/reset-password/page.tsx`**

```tsx
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /mnt/hd/CRM-PLUS
npx tsc --noEmit 2>&1 | grep -E "error|warning" | head -20
```

Expected: no errors.

- [ ] **Step 4: Test the page with a real token**

1. Get a fresh reset token: trigger Task 2's curl command again to create a new token
2. Check DB for the new token value in Prisma Studio
3. Open: `http://localhost:3000/reset-password?token=PASTE_TOKEN_HERE`
4. Enter a new password + confirm → submit
5. Should redirect to `/login?reset=true`

- [ ] **Step 5: Test invalid token**

Open: `http://localhost:3000/reset-password?token=fakefakefake`
Expected: form submits → error message "Token inválido ou expirado."

- [ ] **Step 6: Test missing token**

Open: `http://localhost:3000/reset-password`
Expected: "Link inválido. Solicitar novo link." message.

- [ ] **Step 7: Commit**

```bash
git add "app/(auth)/reset-password/"
git commit -m "feat: add reset-password page and form"
```

---

## Task 6: Update login page with forgot-password link and reset success banner

**Files:**
- Modify: `app/(auth)/login/page.tsx`

The current login page (lines 138–154) has this footer section:

```tsx
<div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
  <div>
    Não tem conta?{" "}
    <a href="/register" className="font-medium text-primary hover:underline">
      Criar empresa
    </a>
  </div>
  {!isDemo && (
    <div>
      <a href="/login?demo=1" className="text-xs text-muted-foreground hover:text-primary hover:underline">
        Ver conta demonstração
      </a>
    </div>
  )}
</div>
```

The `searchParams` type needs `reset` added. Current type is:
```typescript
searchParams: Promise<{ callbackUrl?: string; error?: string; demo?: string; registered?: string }>
```

- [ ] **Step 1: Add `reset` to `searchParams` type in `app/(auth)/login/page.tsx`**

Find this line (line 14):
```typescript
  searchParams: Promise<{ callbackUrl?: string; error?: string; demo?: string; registered?: string }>;
```

Replace with:
```typescript
  searchParams: Promise<{ callbackUrl?: string; error?: string; demo?: string; registered?: string; reset?: string }>;
```

- [ ] **Step 2: Destructure the new `reset` parameter**

Find this block (lines 16–20):
```typescript
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";
  const error = params.error;
  const isDemo = params.demo === "1";
  const registered = params.registered === "true";
```

Replace with:
```typescript
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";
  const error       = params.error;
  const isDemo      = params.demo === "1";
  const registered  = params.registered === "true";
  const resetOk     = params.reset === "true";
```

- [ ] **Step 3: Add reset success banner**

Find the `{registered && (...)}` block (lines 35–40):
```tsx
        {registered && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Conta criada com sucesso! Entre com seu e-mail e senha.
          </div>
        )}
```

Add the reset banner immediately after it:
```tsx
        {registered && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Conta criada com sucesso! Entre com seu e-mail e senha.
          </div>
        )}

        {resetOk && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Senha redefinida com sucesso! Entre com sua nova senha.
          </div>
        )}
```

- [ ] **Step 4: Add "Esqueceu a senha?" link to the footer section**

Find this block (lines 138–154 approximately):
```tsx
            <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
              <div>
                Não tem conta?{" "}
                <a href="/register" className="font-medium text-primary hover:underline">
                  Criar empresa
                </a>
              </div>
              {!isDemo && (
                <div>
                  <a href="/login?demo=1" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                    Ver conta demonstração
                  </a>
                </div>
              )}
            </div>
```

Replace with:
```tsx
            <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
              <div>
                <a href="/forgot-password" className="text-xs hover:text-primary hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <div>
                Não tem conta?{" "}
                <a href="/register" className="font-medium text-primary hover:underline">
                  Criar empresa
                </a>
              </div>
              {!isDemo && (
                <div>
                  <a href="/login?demo=1" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                    Ver conta demonstração
                  </a>
                </div>
              )}
            </div>
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 6: Full end-to-end test**

1. Open http://localhost:3000/login → confirm "Esqueceu a senha?" link is visible
2. Click link → `/forgot-password` page opens
3. Enter `admin@acme.com.br` → submit → success message shown
4. Get token from DB: open Prisma Studio → copy the latest `token` value
5. Open `http://localhost:3000/reset-password?token=PASTE_TOKEN`
6. Enter new password `NovaSenha123` → submit
7. Should redirect to `/login?reset=true`
8. Login page should show "Senha redefinida com sucesso!" banner
9. Try logging in with `admin@acme.com.br` / `NovaSenha123` → should succeed

- [ ] **Step 7: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat: add forgot-password link and reset success banner to login page"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** forgot-password flow ✅, reset-password flow ✅, login link ✅, success banner ✅
- [x] **Placeholder scan:** no TBDs, all code complete
- [x] **Type consistency:** `token: string` used consistently across API route, form component, and page
- [x] **Security:** no email enumeration (always same 200 response), token is single-use, 1-hour expiry, bcrypt cost 12, rate limit 3/5min
- [x] **No email service = no crash:** `sendEmail` is a no-op when `RESEND_API_KEY` not set
