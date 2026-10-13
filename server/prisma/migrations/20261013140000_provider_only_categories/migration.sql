-- Categories belong to providers only. An organization's are derived from its providers'
-- on read, and a service carries none. Pre-release: the old links are dropped, not moved.
DROP TABLE "OrganizationCategory";

-- Dropping the column drops "Service_categoryId_fkey" with it.
ALTER TABLE "Service" DROP COLUMN "categoryId";

-- Custom categories no provider uses any more. The predefined ones always stay — keep this
-- list in step with SEEDED_CATEGORY_NAMES in server/src/lib/category-names.ts.
DELETE FROM "Category" c
WHERE c."name" NOT IN ('General Practice', 'Dentistry', 'Physiotherapy', 'Dermatology', 'Cardiology', 'Mental Health')
  AND NOT EXISTS (SELECT 1 FROM "ProviderCategory" pc WHERE pc."categoryId" = c."id");
