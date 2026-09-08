-- AlterTable Appointment: a booking no longer requires a Consumer row.
-- An anonymous visitor books with the guest* columns and a null consumerId; a
-- signed-in caller always books against a real Consumer (created on the fly for a
-- provider, who is already OTP-verified).
ALTER TABLE "Appointment" ALTER COLUMN "consumerId" DROP NOT NULL;

ALTER TABLE "Appointment" ADD COLUMN "guestFirstName" TEXT,
ADD COLUMN "guestLastName" TEXT,
ADD COLUMN "guestPhoneCode" INTEGER,
ADD COLUMN "guestPhoneNumber" BIGINT,
ADD COLUMN "guestEmail" TEXT,
ADD COLUMN "paymentMethods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Every appointment must name a booker one way or the other. Prisma cannot express
-- a table-level CHECK, so it lives here — without it a bug that forgets both leaves
-- an appointment nobody can be contacted about.
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_actor_present"
  CHECK (
    "consumerId" IS NOT NULL
    OR (
      "guestFirstName" IS NOT NULL
      AND "guestLastName" IS NOT NULL
      AND "guestPhoneNumber" IS NOT NULL
    )
  );

-- Reshape paymentInfo from one preferred method to the set of accepted ones:
--   {"method": "cash"}  ->  {"methods": ["cash"]}
-- Three places store this JSON: both profile tables plus the Provider.draft overlay.
-- Guarded on `? 'method'` so the migration is safe to re-run and leaves rows that
-- already carry `methods` alone.
UPDATE "Provider"
SET "paymentInfo" = ("paymentInfo" - 'method')
  || jsonb_build_object('methods', jsonb_build_array("paymentInfo" -> 'method'))
WHERE "paymentInfo" ? 'method';

UPDATE "Consumer"
SET "paymentInfo" = ("paymentInfo" - 'method')
  || jsonb_build_object('methods', jsonb_build_array("paymentInfo" -> 'method'))
WHERE "paymentInfo" ? 'method';

UPDATE "Provider"
SET "draft" = jsonb_set(
  "draft",
  '{paymentInfo}',
  ("draft" -> 'paymentInfo') - 'method'
    || jsonb_build_object('methods', jsonb_build_array("draft" -> 'paymentInfo' -> 'method'))
)
WHERE "draft" -> 'paymentInfo' ? 'method';
