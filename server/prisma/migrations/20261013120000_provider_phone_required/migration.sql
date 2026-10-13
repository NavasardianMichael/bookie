-- Provider contact phone is NOT NULL again, as on Consumer. Pre-release: the providers who
-- registered while it was optional are deleted together with their whole account rather
-- than carried as a special case.
--
-- Deletes the User, which cascades to its Provider and Consumer rows. Appointment points at
-- Provider, Service and Consumer with Restrict, so the appointments on either side of those
-- accounts go first; everything else hanging off them cascades.
DELETE FROM "Appointment"
WHERE "providerId" IN (
    SELECT "id" FROM "Provider" WHERE "phoneCode" IS NULL OR "phoneNumber" IS NULL
  )
  OR "consumerId" IN (
    SELECT c."id"
    FROM "Consumer" c
    JOIN "Provider" p ON p."userId" = c."userId"
    WHERE p."phoneCode" IS NULL OR p."phoneNumber" IS NULL
  );

DELETE FROM "User"
WHERE "id" IN (
  SELECT "userId" FROM "Provider" WHERE "phoneCode" IS NULL OR "phoneNumber" IS NULL
);

ALTER TABLE "Provider" ALTER COLUMN "phoneCode" SET NOT NULL;
ALTER TABLE "Provider" ALTER COLUMN "phoneNumber" SET NOT NULL;
