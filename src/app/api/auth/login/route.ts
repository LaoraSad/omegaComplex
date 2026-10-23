import { NextRequest, NextResponse } from "next/server";

import { loginSchema } from "@/features/auth/auth.schemas";
import { login } from "@/features/auth/auth.service";
import { ipDesdeHeaders } from "@/features/auth/login-rate-limit";
import { ok } from "@/shared/http/api-response";
import { ValidationError } from "@/shared/http/errors";
import { handler } from "@/shared/http/handler";

export const POST = handler(async (req: NextRequest) => {
  const body = await req.json();

  const result = loginSchema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Datos de login inválidos");
  }

  // La IP se pasa al servicio para que el límite de intentos pueda bloquear
  // también el barrido de muchas cuentas desde una misma conexión.
  const user = await login(result.data, ipDesdeHeaders(req.headers));

  return NextResponse.json(ok(user), {
    status: 200,
  });
});
