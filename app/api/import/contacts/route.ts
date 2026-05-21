import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/auth/get-session";
import { can } from "@/lib/auth/permissions";
import { importContactsFromCsv } from "@/lib/import/contact-import";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!can(session.role, "create", "contacts")) return forbidden();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Envie o arquivo CSV." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Campo file obrigatório." }, { status: 400 });
  }

  const csvText = await file.text();
  const updateExisting = form.get("updateExisting") !== "false";

  const result = await importContactsFromCsv(session.tenantId, csvText, {
    updateExisting,
  });

  return NextResponse.json({ data: result });
}
