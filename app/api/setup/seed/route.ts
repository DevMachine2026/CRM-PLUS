/**
 * Cria usuário admin se o banco estiver vazio (primeiro deploy Render).
 * Abra uma vez: GET /api/setup/seed
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { seedDemo } from "@/lib/demo/seed";

export async function GET() {
  try {
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      return NextResponse.json({
        ok: true,
        alreadySeeded: true,
        userCount,
        hint: "Use admin@acme.com.br / senha123 ou o e-mail que você registrou.",
      });
    }

    const hash = await bcrypt.hash("senha123", 10);

    const tenant = await prisma.tenant.upsert({
      where: { slug: "acme" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "ACME Vendas Ltda",
        slug: "acme",
        plan: "pro",
        status: "active",
      },
    });

    await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: tenant.id, email: "admin@acme.com.br" },
      },
      update: { passwordHash: hash, isActive: true },
      create: {
        id: "00000000-0000-0000-0000-000000000010",
        tenantId: tenant.id,
        name: "Carlos Silva",
        email: "admin@acme.com.br",
        passwordHash: hash,
        role: "owner",
        isActive: true,
      },
    });

    await seedDemo();

    return NextResponse.json({
      ok: true,
      message: "Usuários criados. Faça login.",
      accounts: [
        { email: "admin@acme.com.br", password: "senha123" },
        { email: "demo@crmplus.com.br", password: "demo1234" },
      ],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[setup/seed]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
