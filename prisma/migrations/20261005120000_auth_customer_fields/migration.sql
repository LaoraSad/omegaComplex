-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "birthDate" DATE;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_document_key" ON "Customer"("document");
