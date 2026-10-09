-- CreateTable
CREATE TABLE "ReservationBlock" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationBlock_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "QrToken" ADD COLUMN     "blockId" UUID;

-- Backfill: cada reserva existente pasa a tener un unico bloque, el mismo que
-- venia implícito en Reservation.serviceId + startsAt + endsAt. Asi ninguna
-- reserva queda sin zona y los QROld siguen apuntando a algo valido.
INSERT INTO "ReservationBlock" ("id", "reservationId", "serviceId", "startsAt", "endsAt", "createdAt")
SELECT gen_random_uuid(), r."id", r."serviceId", r."startsAt", r."endsAt", r."createdAt"
FROM "Reservation" r
WHERE NOT EXISTS (SELECT 1 FROM "ReservationBlock" b WHERE b."reservationId" = r."id");

-- Backfill: cada QR heredaba la zona de su reserva; ahora la toma del bloque.
UPDATE "QrToken" q
SET "blockId" = b."id"
FROM "ReservationBlock" b
WHERE b."reservationId" = q."reservationId"
  AND q."blockId" IS NULL;

-- CreateIndex
CREATE INDEX "ReservationBlock_reservationId_startsAt_idx" ON "ReservationBlock"("reservationId", "startsAt");

-- CreateIndex
CREATE INDEX "ReservationBlock_serviceId_startsAt_idx" ON "ReservationBlock"("serviceId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationBlock_reservationId_serviceId_startsAt_key" ON "ReservationBlock"("reservationId", "serviceId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "QrToken_reservationId_blockId_seqNo_key" ON "QrToken"("reservationId", "blockId", "seqNo");

-- AddForeignKey
ALTER TABLE "ReservationBlock" ADD CONSTRAINT "ReservationBlock_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationBlock" ADD CONSTRAINT "ReservationBlock_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrToken" ADD CONSTRAINT "QrToken_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ReservationBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;