import { NextRequest, NextResponse } from "next/server";

import { loginSchema } from "@/features/auth/auth.schemas";
import { login } from "@/features/auth/auth.service";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

export const POST = handler(async (req: NextRequest) => {
  const body = await req.json();

  const result = loginSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Datos de login inválidos");
  }

  const user = await login(result.data);

  return NextResponse.json(ok(user), {
    status: 200,
  });
});
