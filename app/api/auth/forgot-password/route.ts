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

      // HTML escape user name to prevent XSS
      const safeName = user.name
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      await sendEmail({
        to:      email,
        subject: "Redefinição de senha — CRM PLUS",
        html: `
          <p>Olá, ${safeName}!</p>
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
