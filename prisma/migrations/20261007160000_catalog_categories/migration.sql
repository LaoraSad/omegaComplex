-- Preserve the category label shown on historical reservations before
-- reclassifying services.
BEGIN;

ALTER TABLE "Category"
ADD COLUMN "slug" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Reservation"
ADD COLUMN "categoryNameSnapshot" TEXT;

UPDATE "Reservation" AS r
SET "categoryNameSnapshot" = c."name"
FROM "Service" AS s
JOIN "Category" AS c ON c."id" = s."categoryId"
WHERE r."serviceId" = s."id";

-- Keep legacy categories for referential history, but do not expose them as
-- active catalog entries. Exact target names receive stable public slugs.
UPDATE "Category"
SET "slug" = CASE "name"
  WHEN 'Piscinas' THEN 'piscinas'
  WHEN 'Canchas' THEN 'canchas'
  WHEN 'Zonas húmedas' THEN 'zonas-humedas'
  WHEN 'Gimnasio' THEN 'gimnasio'
  ELSE 'legacy-' || replace("id"::text, '-', '')
END,
"isActive" = false;

INSERT INTO "Category" ("id", "name", "slug", "isActive")
VALUES
  ('31b6b054-5068-47d3-8752-34e20c9a2d10', 'Piscinas', 'piscinas', true),
  ('7f02d0c8-b70c-47a2-84dd-6b28924795d3', 'Canchas', 'canchas', true),
  ('cb47f2d0-b506-4fc9-96b5-a3856b5449b5', 'Zonas húmedas', 'zonas-humedas', true),
  ('a0ac35c9-7135-4b89-8c26-231de3685799', 'Gimnasio', 'gimnasio', true)
ON CONFLICT ("name") DO UPDATE
SET "slug" = EXCLUDED."slug",
    "isActive" = true;

DO $$
DECLARE
  unmapped_services TEXT;
BEGIN
  SELECT string_agg("name", ', ' ORDER BY "name")
  INTO unmapped_services
  FROM (
    SELECT DISTINCT "name"
    FROM "Service"
    WHERE NOT (
      lower(trim("name")) LIKE '%piscina%'
      OR lower(trim("name")) LIKE '%cancha%'
      OR lower(trim("name")) LIKE 'polideportiva%'
      OR lower(trim("name")) LIKE 'polideportivo%'
      OR lower(trim("name")) LIKE '%gimnasio%'
      OR lower(trim("name")) LIKE '%turco%'
      OR lower(trim("name")) LIKE '%sauna%'
    )
  ) AS unmapped;

  IF unmapped_services IS NOT NULL THEN
    RAISE EXCEPTION 'Catalog migration stopped; classify these services first: %', unmapped_services;
  END IF;
END $$;

UPDATE "Service" AS s
SET "categoryId" = c."id"
FROM "Category" AS c
WHERE c."name" = CASE
  WHEN lower(trim(s."name")) LIKE '%piscina%' THEN 'Piscinas'
  WHEN lower(trim(s."name")) LIKE '%cancha%'
    OR lower(trim(s."name")) LIKE 'polideportiva%'
    OR lower(trim(s."name")) LIKE 'polideportivo%' THEN 'Canchas'
  WHEN lower(trim(s."name")) LIKE '%gimnasio%' THEN 'Gimnasio'
  WHEN lower(trim(s."name")) LIKE '%turco%'
    OR lower(trim(s."name")) LIKE '%sauna%' THEN 'Zonas húmedas'
END;

ALTER TABLE "Category"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

UPDATE "Category"
SET "isActive" = true
WHERE "name" IN ('Piscinas', 'Canchas', 'Zonas húmedas', 'Gimnasio');

COMMIT;
