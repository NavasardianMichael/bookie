-- Capability URL for every appointment. The raw token is never stored; only
-- sha256(token) lives on the row. Existing bookings get a unique backfill so
-- the column can be NOT NULL without blocking migrate on a populated table.

ALTER TABLE "Appointment" ADD COLUMN "manageTokenHash" TEXT;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "Appointment"
SET "manageTokenHash" = encode(digest(id || gen_random_uuid()::text, 'sha256'), 'hex')
WHERE "manageTokenHash" IS NULL;

ALTER TABLE "Appointment" ALTER COLUMN "manageTokenHash" SET NOT NULL;

CREATE UNIQUE INDEX "Appointment_manageTokenHash_key" ON "Appointment"("manageTokenHash");
