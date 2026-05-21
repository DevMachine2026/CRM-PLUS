import { NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/auth/get-session";
import { CONTACTS_CSV_TEMPLATE } from "@/lib/import/contact-import";
import { PRODUCTS_CSV_TEMPLATE } from "@/lib/import/product-import";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { type } = await params;

  if (type === "contacts") {
    return new NextResponse(CONTACTS_CSV_TEMPLATE, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="modelo-contatos.csv"',
      },
    });
  }

  if (type === "products") {
    return new NextResponse(PRODUCTS_CSV_TEMPLATE, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="modelo-produtos.csv"',
      },
    });
  }

  return NextResponse.json({ error: "Tipo inválido." }, { status: 404 });
}
