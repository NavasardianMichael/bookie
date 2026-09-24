-- Favourites move from the Consumer profile to the account (`User`).
--
-- A provider holds no Consumer row until they book someone, so a Consumer-keyed favourite
-- was unreachable for them. Existing rows are carried across through `Consumer.userId`,
-- which is unique, so no two rows can collapse onto one key.

ALTER TABLE "FavoriteProvider" ADD COLUMN "userId" TEXT;
ALTER TABLE "FavoriteProvider" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "FavoriteProvider" AS f
SET "userId" = c."userId"
FROM "Consumer" AS c
WHERE c."id" = f."consumerId";

-- The new rule: nobody favourites their own page. Only reachable for an account holding
-- both profiles, whose Consumer-side row pointed at its own Provider.
DELETE FROM "FavoriteProvider" AS f
USING "Provider" AS p
WHERE p."id" = f."providerId" AND p."userId" = f."userId";

-- Unreachable while the Consumer foreign key cascades, but a NOT NULL below would abort the
-- whole migration on one orphan, and an orphan is not worth keeping.
DELETE FROM "FavoriteProvider" WHERE "userId" IS NULL;

ALTER TABLE "FavoriteProvider" ALTER COLUMN "userId" SET NOT NULL;

-- `IF EXISTS` on each: the init migration created both the primary key and a redundant
-- unique index (docs/BACKLOG.md #8), and a database that drifted either way must still
-- migrate.
ALTER TABLE "FavoriteProvider" DROP CONSTRAINT IF EXISTS "FavoriteProvider_consumerId_fkey";
ALTER TABLE "FavoriteProvider" DROP CONSTRAINT IF EXISTS "FavoriteProvider_pkey";
DROP INDEX IF EXISTS "FavoriteProvider_consumerId_providerId_key";
ALTER TABLE "FavoriteProvider" DROP COLUMN "consumerId";

ALTER TABLE "FavoriteProvider" ADD CONSTRAINT "FavoriteProvider_pkey" PRIMARY KEY ("userId", "providerId");
ALTER TABLE "FavoriteProvider" ADD CONSTRAINT "FavoriteProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
