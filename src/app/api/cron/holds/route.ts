import { NextRequest, NextResponse } from "next/server";

import { liberarHoldsVencidos } from "@/features/reservations/reservations.service";
import { obtenerContactoAviso } from "@/features/payments/payments.repository";
import { sendHoldExpiradoEmail } from "@/lib/email/resend";
import { db } from "@/shared/lib/db";
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

  // Fase 3.1: solo este barrido proactivo avisa. Las liberaciones perezosas
  // (lecturas de calendario, creación de reservas) no mandan correo: hacerlo
  // ahí sería notificar en mitad de la petición de otro cliente.
  const expiradas: string[] = [];
  const liberadas = await liberarHoldsVencidos(new Date(), db, null, (id) => {
    expiradas.push(id);
  });
  logger.info("cron.holds_liberados", { liberadas });

  let notificados = 0;
  for (const reservationId of expiradas) {
    try {
      const contacto = await obtenerContactoAviso(reservationId);
      if (!contacto) continue;
      await sendHoldExpiradoEmail(contacto.email, {
        nombre: contacto.nombre,
        fecha: contacto.startsAt.toLocaleDateString("es-CO", {
          timeZone: "America/Bogota",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        servicio: contacto.servicio,
      });
      notificados += 1;
    } catch (error) {
      logger.error("cron.hold_email_fallido", { reservationId, error });
    }
  }

  return NextResponse.json(ok({ liberadas, notificados }));
});