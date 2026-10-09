import { NextRequest, NextResponse } from "next/server";
import { createCategory, listCategories } from "@/features/catalog";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { requireRole } from "@/shared/auth/require-role";
import { ValidationError } from "@/shared/http/errors";
import { createCategorySchema } from "@/features/catalog/catalog.schemas";

export const GET = handler(async (req: NextRequest) => {
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";
  if (includeInactive) await requireRole("admin");
  return NextResponse.json(ok(await listCategories(includeInactive)));
});

export const POST = handler(async (req: NextRequest) => {
  await requireRole("admin");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("El cuerpo debe ser JSON válido");
  }
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message);

  const category = await createCategory(parsed.data);
  return NextResponse.json(ok(category), { status: 201 });
});
