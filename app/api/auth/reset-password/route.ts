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
