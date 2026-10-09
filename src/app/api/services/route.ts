import { NextRequest, NextResponse } from "next/server";
import { listCatalogServices } from "@/features/catalog";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const GET = handler(async (req: NextRequest) => {
  const categorySlug = req.nextUrl.searchParams.get("category");
  if (categorySlug && !CATEGORY_SLUG_PATTERN.test(categorySlug)) {
    throw new ValidationError("El slug de categoría no es válido");
  }

  return NextResponse.json(ok(await listCatalogServices(categorySlug ?? undefined)));
});