import { NextResponse } from "next/server";
import { getCatalogService } from "@/features/catalog";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

export const GET = handler(async (_req, context) => {
  const id = (await context?.params)?.id;
  const parsed = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id ?? "");
  if (!parsed) throw new ValidationError("El identificador de servicio no es válido");
  return NextResponse.json(ok(await getCatalogService(id!)));
});