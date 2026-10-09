-- CreateTable
CREATE TABLE "ReservationGuest" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "isTitular" BOOLEAN NOT NULL DEFAULT false,
    "qrTokenId" UUID,

    CONSTRAINT "ReservationGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationGuest_qrTokenId_key" ON "ReservationGuest"("qrTokenId");

-- CreateIndex
CREATE INDEX "ReservationGuest_reservationId_idx" ON "ReservationGuest"("reservationId");

-- AddForeignKey
ALTER TABLE "ReservationGuest" ADD CONSTRAINT "ReservationGuest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationGuest" ADD CONSTRAINT "ReservationGuest_qrTokenId_fkey" FOREIGN KEY ("qrTokenId") REFERENCES "QrToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
