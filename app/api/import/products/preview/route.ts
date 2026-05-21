import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { previewProductsFromCsv } from "@/lib/import/product-import";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "create", "products")) return forbidden();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie o arquivo CSV." }, { status: 400 });
  }

  const preview = await previewProductsFromCsv(session.tenantId, await file.text());
  return NextResponse.json({ data: preview });
}
