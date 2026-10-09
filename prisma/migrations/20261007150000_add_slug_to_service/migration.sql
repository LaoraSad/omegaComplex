-- Add slug column with default value
ALTER TABLE "Service" ADD COLUMN "slug" TEXT;

-- Generate slugs from names for existing rows
UPDATE "Service" SET "slug" = lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'));

-- Make slug required and add unique constraint
ALTER TABLE "Service" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");