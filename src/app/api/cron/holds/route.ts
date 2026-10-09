import { NextRequest, NextResponse } from "next/server";

import { liberarHoldsVencidos } from "@/features/reservations/reservations.service";
import { ok } from "@/shared/http/api-response";
import { handler } from "@/shared/http/handler";
import { logger } from "@/shared/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET;

export const GET = handler(async (req: NextRequest) => {
  // Cerrado por defecto: sin secreto configurado nadie puede disparar el cron.
  if (!CRON_SECRET) {
    logger.error("cron.sin_secreto");
    return NextResponse.json({ error: "Cron no configurado" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const liberadas = await liberarHoldsVencidos();
  logger.info("cron.holds_liberados", { liberadas });
  return NextResponse.json(ok({ liberadas }));
});