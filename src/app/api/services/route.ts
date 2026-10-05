import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { catalogService } from "@/features/catalog/catalog.service";

export const GET = handler(async () => {
  const services = await catalogService.getServices();

  return NextResponse.json(ok(services));
});