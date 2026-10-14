// Listado y creación de servicios catálogo.
import { NextRequest, NextResponse } from "next/server";
import { listCatalogServices } from "@/features/catalog";
import { createService } from "@/features/admin/admin.repository";
import { firstIssue, serviceCreateSchema } from "@/features/admin/admin.schemas";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";
import { requireRole } from "@/shared/auth/require-role";

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const GET = handler(async (req: NextRequest) => {
  const categorySlug = req.nextUrl.searchParams.get("category");
  if (categorySlug && !CATEGORY_SLUG_PATTERN.test(categorySlug)) {
    throw new ValidationError("El slug de categoría no es válido");
  }

  return NextResponse.json(ok(await listCatalogServices(categorySlug ?? undefined)));
});

export const POST = handler(async (req: NextRequest) => {
  await requireRole("admin");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("El cuerpo debe ser JSON válido");
  }
  const parsed = serviceCreateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(firstIssue(parsed.error));

  const service = await createService(parsed.data);
  return NextResponse.json(ok(service), { status: 201 });
});