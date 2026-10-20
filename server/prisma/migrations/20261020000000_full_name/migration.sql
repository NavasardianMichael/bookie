-- One `fullName` for every person: Provider, Consumer, and a guest booking's booker.
--
-- The exact reverse of `20260905000000_consumer_name_split_and_email`. A first/last pair
-- assumes every name is "given family", which is wrong for much of the world and made
-- every form ask twice for what people think of as one thing.
--
-- Written by hand: `prisma migrate dev` would drop the old columns before anything could
-- be copied out of them. The new columns arrive nullable, are backfilled, then tightened.
--
-- The join trims each part and skips an empty one, so a Google sign-up that stored
-- `lastName = ''` becomes "Anna", not "Anna ".

-- 1. Provider ------------------------------------------------------------------------
ALTER TABLE "Provider" ADD COLUMN "fullName" TEXT;

UPDATE "Provider"
SET "fullName" = btrim(concat_ws(' ', NULLIF(btrim("firstName"), ''), NULLIF(btrim("lastName"), '')));

ALTER TABLE "Provider" ALTER COLUMN "fullName" SET NOT NULL;

-- The unpublished overlay carries the same two keys. Left alone, Publish would read a
-- `fullName` that is not there and drop a pending name edit on the floor.
UPDATE "Provider"
SET "draft" = ("draft" - 'firstName' - 'lastName')
  || jsonb_build_object(
    'fullName',
    btrim(concat_ws(' ', NULLIF(btrim("draft" ->> 'firstName'), ''), NULLIF(btrim("draft" ->> 'lastName'), '')))
  )
WHERE "draft" ? 'firstName' OR "draft" ? 'lastName';

DROP INDEX "Provider_listed_lastName_firstName_idx";

ALTER TABLE "Provider" DROP COLUMN "firstName";
ALTER TABLE "Provider" DROP COLUMN "lastName";

CREATE INDEX "Provider_listed_fullName_idx" ON "Provider"("listed", "fullName");

-- 2. Consumer ------------------------------------------------------------------------
ALTER TABLE "Consumer" ADD COLUMN "fullName" TEXT;

UPDATE "Consumer"
SET "fullName" = btrim(concat_ws(' ', NULLIF(btrim("firstName"), ''), NULLIF(btrim("lastName"), '')));

ALTER TABLE "Consumer" ALTER COLUMN "fullName" SET NOT NULL;

ALTER TABLE "Consumer" DROP COLUMN "firstName";
ALTER TABLE "Consumer" DROP COLUMN "lastName";

-- 3. Appointment (guest booker) ------------------------------------------------------
-- Dropped first and re-added by hand: dropping a column a CHECK reads drops the CHECK
-- with it, silently, and the booker rule would be gone.
ALTER TABLE "Appointment" DROP CONSTRAINT "appointment_actor_present";

ALTER TABLE "Appointment" ADD COLUMN "guestFullName" TEXT;

UPDATE "Appointment"
SET "guestFullName" = NULLIF(
  btrim(concat_ws(' ', NULLIF(btrim("guestFirstName"), ''), NULLIF(btrim("guestLastName"), ''))),
  ''
)
WHERE "guestFirstName" IS NOT NULL OR "guestLastName" IS NOT NULL;

ALTER TABLE "Appointment" DROP COLUMN "guestFirstName";
ALTER TABLE "Appointment" DROP COLUMN "guestLastName";

ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_actor_present"
  CHECK (
    "consumerId" IS NOT NULL
    OR (
      "guestFullName"    IS NOT NULL
      AND "guestPhoneNumber" IS NOT NULL
    )
  );
