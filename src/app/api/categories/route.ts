import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";

// TODO(Dev2): listar/crear categorías (catalog).
export const GET = handler(async () => {
  return NextResponse.json(ok([]));
});

export const POST = handler(async () => {
  return NextResponse.json(ok({ todo: "create-category" }), { status: 201 });
});
