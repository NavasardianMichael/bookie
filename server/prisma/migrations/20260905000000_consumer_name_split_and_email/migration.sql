-- Consumer: split `name` into `firstName` + `lastName`, and add an optional `email`.
--
-- Registration now collects the two names separately and stores them that way; only the
-- client ever joins them for display. `email` is collected at registration too (optional
-- for consumers, required for providers, who already had the column).
--
-- Written by hand rather than generated: `prisma migrate dev` wanted to add two NOT NULL
-- columns to a table with existing rows and drop `name` outright, which would have
-- discarded every seeded consumer's identity. The columns therefore arrive nullable, get
-- backfilled from `name`, and are tightened afterwards.

-- 1. Add nullable so existing rows survive the ALTER.
ALTER TABLE "Consumer" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Consumer" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Consumer" ADD COLUMN "email" TEXT;

-- 2. Backfill: everything before the first space is the first name, the remainder the last.
--    A single-word name keeps an empty last name rather than duplicating itself.
UPDATE "Consumer"
SET
  "firstName" = split_part("name", ' ', 1),
  "lastName" = CASE
    WHEN position(' ' IN "name") > 0 THEN btrim(substring("name" FROM position(' ' IN "name") + 1))
    ELSE ''
  END
WHERE "firstName" IS NULL;

-- 3. Now that every row has a value, match the schema's non-null columns.
ALTER TABLE "Consumer" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Consumer" ALTER COLUMN "lastName" SET NOT NULL;

-- 4. `name` is fully superseded.
ALTER TABLE "Consumer" DROP COLUMN "name";
