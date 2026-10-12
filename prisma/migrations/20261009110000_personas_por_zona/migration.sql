-- Personas por zona.
--
-- Antes `personas` era un valor único de la reserva que se repetía en cada
-- bloque: alguien que iba solo a la cancha y con tres amigos a la piscina
-- retenía 4 cupos en las dos zonas y pagaba 8 horas-persona. Con esto cada zona
-- declara cuántas personas entran por su puerta.

-- AlterTable
ALTER TABLE "ReservationBlock" ADD COLUMN     "personas" INTEGER NOT NULL DEFAULT 1;

-- Backfill: los bloques existentes heredan el valor que tenía la reserva, que
-- era el mismo para todos. Es el mejor supuesto posible sin datos del carrito.
UPDATE "ReservationBlock" b
SET "personas" = r."quantity"
FROM "Reservation" r
WHERE r."id" = b."reservationId";

-- CreateTable
CREATE TABLE "ReservationBlockGuest" (
    "blockId" UUID NOT NULL,
    "guestId" UUID NOT NULL,

    CONSTRAINT "ReservationBlockGuest_pkey" PRIMARY KEY ("blockId", "guestId")
);

-- CreateIndex
CREATE INDEX "ReservationBlockGuest_guestId_idx" ON "ReservationBlockGuest"("guestId");

-- AddForeignKey
ALTER TABLE "ReservationBlockGuest" ADD CONSTRAINT "ReservationBlockGuest_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ReservationBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationBlockGuest" ADD CONSTRAINT "ReservationBlockGuest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "ReservationGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: como antes todas las personas de la reserva iban a todas las zonas,
-- cada invitado queda anotado en cada bloque de su reserva.
INSERT INTO "ReservationBlockGuest" ("blockId", "guestId")
SELECT b."id", g."id"
FROM "ReservationBlock" b
JOIN "ReservationGuest" g ON g."reservationId" = b."reservationId"
ON CONFLICT DO NOTHING;