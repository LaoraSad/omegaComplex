import { NextResponse } from "next/server";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { deleteSession } from "@/shared/auth/session";

export const POST = handler(async () => {
  await deleteSession();
  return NextResponse.json(ok({ loggedOut: true }));
});
