// Consulta y descarga de los QR de una reserva del cliente autenticado.
import { NextResponse } from "next/server";

import { formatShortCode } from "@/features/access/short-code";
import { getCustomerReservationQrs } from "@/features/reservations/reservations.repository";
import { generarPdfQr } from "@/shared/pdf/qr-pdf";
import { getSession } from "@/shared/auth/session";
import { handler } from "@/shared/http/handler";
import { ok } from "@/shared/http/api-response";
import { ConflictError, NotFoundError, UnauthorizedError } from "@/shared/http/errors";

export const GET = handler(async (req, ctx) => {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();

  const reservationId = String((await ctx?.params)?.id ?? "");
  const reservation = await getCustomerReservationQrs(session.userId, reservationId);
  if (!reservation) throw new NotFoundError("Reserva no encontrada");

  const qrs = reservation.qrTokens.map((qr) => ({
    id: qr.id,
    seqNo: qr.seqNo,
    status: qr.status,
    codigo: qr.shortCode,
    codigoTexto: qr.shortCode ? formatShortCode(qr.shortCode) : null,
    nombre: qr.guest?.fullName ?? "Titular de la reserva",
    servicio: qr.block?.service.name ?? "Servicio",
    zona: qr.block?.service.category.name ?? "Acceso",
  }));

  if (new URL(req.url).searchParams.get("format") === "pdf") {
    if (reservation.status !== "confirmed" || reservation.endsAt < new Date()) {
      throw new ConflictError("Esta reserva ya no tiene pases vigentes.");
    }

    const codigos = reservation.qrTokens.flatMap((qr) => {
      if (!qr.shortCode) return [];
      return [
        {
          etiqueta: `PASE #${String(qr.seqNo).padStart(2, "0")}`,
          servicio: qr.block?.service.name ?? "Servicio",
          zona: qr.block?.service.category.name ?? "Acceso",
          nombre: qr.guest?.fullName ?? "Titular de la reserva",
          token: qr.shortCode,
          codigoCorto: qr.shortCode,
        },
      ];
    });
    if (codigos.length === 0) {
      throw new ConflictError("No hay códigos QR disponibles para descargar.");
    }

    const nombreCliente =
      `${reservation.customer.user.firstName} ${reservation.customer.user.lastName}`.trim();
    const fecha = new Intl.DateTimeFormat("es-CO", {
      dateStyle: "long",
      timeZone: "America/Bogota",
    }).format(reservation.startsAt);
    const pdf = await generarPdfQr({
      nombre: nombreCliente || "Cliente",
      fecha,
      codigos,
    });

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pases-${reservationId.slice(0, 8)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return NextResponse.json(
    ok({
      qrs,
      noDisponibles: qrs.filter((qr) => !qr.codigo).length,
    }),
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
