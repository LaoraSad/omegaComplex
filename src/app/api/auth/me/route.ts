import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { UnauthorizedError } from "@/shared/http/errors";
import { getSession } from "@/shared/auth/session";
import { findSessionUserById } from "@/features/auth/auth.repository";

export const GET = handler(async () => {
  const session = await getSession();

  if (!session) {
    throw new UnauthorizedError("No autenticado");
  }

  const user = await findSessionUserById(session.userId);

  if (!user) {
    throw new UnauthorizedError("No autenticado");
  }

  return NextResponse.json(ok(user), { status: 200 });
});
