-- Cada persona tiene un QR por zona, no un unico QR para toda la reserva: la
-- relacion Guest <-> QrToken pasa de 1 a 1 a 1 a N. Por eso qrTokenId deja de
-- ser unico en el Guest y el QR lleva ahora su propio guestId.

-- AlterTable
ALTER TABLE "ReservationGuest" DROP COLUMN "qrTokenId";

-- AlterTable
ALTER TABLE "QrToken" ADD COLUMN     "guestId" UUID;

-- Backfill: los QR que ya existian colgaban de la reserva entera, asi que se
-- apuntan al primer invitado de esa reserva.
UPDATE "QrToken" q
SET "guestId" = (
  SELECT g."id" FROM "ReservationGuest" g
  WHERE g."reservationId" = q."reservationId"
  ORDER BY g."isTitular" DESC, g."fullName" ASC
  LIMIT 1
)
WHERE q."guestId" IS NULL;

-- CreateIndex
CREATE INDEX "QrToken_guestId_idx" ON "QrToken"("guestId");

-- AddForeignKey
ALTER TABLE "QrToken" ADD CONSTRAINT "QrToken_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "ReservationGuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;