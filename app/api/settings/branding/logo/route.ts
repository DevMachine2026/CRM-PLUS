import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { parseTenantBranding } from "@/lib/tenant/branding-settings";

const MAX_BYTES = 400_000;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "update", "settings")) return forbidden();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo de imagem." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Use PNG, JPG, WebP ou SVG." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Logo muito grande. Máximo 400 KB." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const logoUrl = `data:${file.type};base64,${base64}`;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { settings: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant não encontrado." }, { status: 404 });
  }

  const branding = parseTenantBranding(tenant.settings);
  const merged = {
    ...(tenant.settings as Record<string, unknown>),
    branding: { ...branding, logoUrl },
  };

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      settings: merged as unknown as Record<
        string,
        string | number | boolean | null
      >,
    },
  });

  return NextResponse.json({ data: { logoUrl } });
}
