import { NextResponse } from "next/server";
import { changePassword } from "@/features/auth/auth.service";
import { changePasswordSchema } from "@/features/auth/auth.schemas";
import { getSession } from "@/shared/auth/session";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { UnauthorizedError, ValidationError } from "@/shared/http/errors";

export const POST = handler(async (req) => {
  const session = await getSession();
  if (!session) throw new UnauthorizedError("Debes iniciar sesión para cambiar tu contraseña");

  const parsed = changePasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.");
  }

  await changePassword(session.userId, parsed.data);
  return NextResponse.json(ok({ message: "Contraseña actualizada correctamente." }));
});
