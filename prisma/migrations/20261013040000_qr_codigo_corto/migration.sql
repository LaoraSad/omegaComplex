-- Código corto transcribible por si la cámara del empleado falla.
-- Mismo acceso que el token: solo evita depender del lector automático.
-- AlterTable
ALTER TABLE "QrToken" ADD COLUMN "shortCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "QrToken_shortCode_key" ON "QrToken"("shortCode");