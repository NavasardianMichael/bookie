-- Collapse duplicate Organization rows onto one row per name.
--
-- `Organization.name` has no unique constraint, and an early version of the seed used a
-- plain `create` — so every `pnpm install` appended another eight rows. The seed was fixed
-- to `findFirst` (see `server/CLAUDE.md`) and is idempotent now, but the rows it already
-- created are still there: 8 distinct names across 56 rows on a database old enough to
-- carry them, which makes Explore list each organization seven times.
--
-- Data-only, and a **no-op on a clean database** — a fresh clone has one row per name and
-- every statement below matches nothing. Deliberately not paired with a `@@unique` on
-- `name`: two real clinics in different cities may legitimately share one, so that is a
-- product decision rather than a cleanup. The paths that produced these duplicates are
-- both closed already (the seed's `findFirst`, and `resolveOrganizationId`'s
-- case-insensitive match at registration).

-- The survivor for each name is the earliest row, with `id` breaking a same-timestamp tie
-- so the choice is deterministic across environments. Matching is case-insensitive to
-- agree with `resolveOrganizationId`, which is what decides whether registration reuses an
-- organization or creates one.
CREATE TEMPORARY TABLE "_org_dedupe" AS
SELECT
  id,
  first_value(id) OVER (PARTITION BY lower(name) ORDER BY "createdAt", id) AS keep_id
FROM "Organization";

DELETE FROM "_org_dedupe" WHERE id = keep_id;

-- Move the categories first: the survivor must end up with the union of every duplicate's
-- categories, or collapsing the rows would silently narrow which searches find it.
-- `ON CONFLICT DO NOTHING` because the pair is the join table's primary key.
INSERT INTO "OrganizationCategory" ("organizationId", "categoryId")
SELECT d.keep_id, oc."categoryId"
FROM "OrganizationCategory" oc
JOIN "_org_dedupe" d ON d.id = oc."organizationId"
ON CONFLICT DO NOTHING;

-- Repoint everything that references a duplicate. All three are `onDelete: SetNull`, so
-- skipping any of them would not fail the delete below — it would quietly orphan the row
-- instead, which is the worse outcome and the reason these are explicit.
UPDATE "Provider" p
SET "organizationId" = d.keep_id
FROM "_org_dedupe" d
WHERE p."organizationId" = d.id;

UPDATE "Appointment" a
SET "organizationId" = d.keep_id
FROM "_org_dedupe" d
WHERE a."organizationId" = d.id;

UPDATE "Review" r
SET "organizationId" = d.keep_id
FROM "_org_dedupe" d
WHERE r."organizationId" = d.id;

-- Nothing points at these any more; their `OrganizationCategory` rows cascade.
DELETE FROM "Organization" o
USING "_org_dedupe" d
WHERE o.id = d.id;

DROP TABLE "_org_dedupe";
