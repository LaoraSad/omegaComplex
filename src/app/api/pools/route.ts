import { NextResponse } from "next/server";

import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { listCatalogServices } from "@/features/catalog/catalog.repository";

// Catálogo real de la base. Antes devolvía un array hardcodeado con precios y
// capacidades inventados que no coincidían con la BD.
export const GET = handler(async (req) => {
  const categorySlug = new URL(req.url).searchParams.get("categoria") ?? undefined;
  const services = await listCatalogServices(categorySlug ?? undefined);
  return NextResponse.json(ok(services));
});