import { NextRequest, NextResponse } from "next/server";

import { runHoldCleanup } from "@/features/reservations/reservations.service";
import { ok } from "@/shared/http/api-response";
import { handler } from "@/shared/http/handler";

const CRON_SECRET = process.env.CRON_SECRET;

export const GET = handler(async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await runHoldCleanup();
  return NextResponse.json(ok(result));
});