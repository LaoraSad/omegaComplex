import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { catalogService } from "@/features/catalog/catalog.service";

export const GET = handler(async (_req, ctx) => {
  const params = await ctx?.params;
  const id = params?.id;

  if (!id) {
    throw new Error("ID de servicio requerido");
  }

  const service = await catalogService.getServiceById(id);

  return NextResponse.json(ok(service));
});