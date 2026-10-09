/**
 * Emisión de los QR de una reserva pagada.
 *
 * El conteo es persona x zona, no persona ni franja: el QR habilita una puerta
 * concreta y el empleado escanea en la puerta de esa zona. Quien reservó
 * piscina y baloncesto lleva dos QR, uno para cada puerta, aunque vaya solo.
 *
 * Cuando el pago se confirme hay que llamar a esto. Es idempotente: si vuelve a
 * correr no duplica tokens.
 */
import { randomBytes, createHash } from "node:crypto";

import { db } from "@/shared/lib/db";

/** Prefijo legible para el PDF: el token no es adivinable. */
function nuevoToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

export type QrEmitido = {
  /** Zona a la que da acceso. */
  zona: string;
  servicio: string;
  nombre: string;
  /** Etiqueta para el PDF: Z2-P03 (zona 2, persona 3). */
  etiqueta: string;
  token: string;
};

export type EmitirResultado =
  | { ok: true; emitidos: QrEmitido[] }
  | { ok: false; message: string };

/**
 * Emite un QR por persona y por zona para una reserva ya pagada.
 *
 * Idempotente por diseño: si la reserva ya tiene QR, los devuelve en vez de
 * crear otros. Así un reintento del webhook de Stripe no rompe nada.
 */
export async function emitirQrDeReserva(reservationId: string): Promise<EmitirResultado> {
  return db.$transaction(async (tx) => {
    const reserva = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: {
        guests: { orderBy: [{ isTitular: "desc" }, { fullName: "asc" }] },
        blocks: {
          orderBy: { startsAt: "asc" },
          include: { service: { select: { name: true, category: { select: { name: true } } } } },
        },
        qrTokens: { select: { id: true, seqNo: true, blockId: true, guestId: true } },
      },
    });

    if (!reserva) return { ok: false, message: "La reserva no existe." };
    if (reserva.blocks.length === 0) return { ok: false, message: "La reserva no tiene bloques." };

    const yaEmitidos = reserva.qrTokens.length;
    const esperados = reserva.guests.length * reserva.blocks.length;
    if (yaEmitidos > 0 && yaEmitidos < esperados) {
      return {
        ok: false,
        message: `La reserva tiene ${yaEmitidos} de ${esperados} QR emitidos. Revísala antes de reintentar.`,
      };
    }
    if (yaEmitidos > 0) return { ok: true, emitidos: [] };

    const emitidos: QrEmitido[] = [];
    for (const [indiceZona, bloque] of reserva.blocks.entries()) {
      const numeroZona = indiceZona + 1;
      for (const [indicePersona, guest] of reserva.guests.entries()) {
        const numeroPersona = indicePersona + 1;
        const { token, hash } = nuevoToken();
        await tx.qrToken.create({
          data: {
            reservationId: reserva.id,
            blockId: bloque.id,
            seqNo: numeroPersona,
            tokenHash: hash,
            guestId: guest.id,
          },
        });
        emitidos.push({
          zona: bloque.service.category.name,
          servicio: bloque.service.name,
          nombre: guest.fullName,
          etiqueta: `Z${numeroZona}-P${String(numeroPersona).padStart(2, "0")}`,
          token,
        });
      }
    }
    return { ok: true, emitidos };
  });
}