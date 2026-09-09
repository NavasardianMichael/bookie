-- Provider-authored SEO metadata and a vanity URL slug.
--
-- Until now `generateMetadata` composed title, description and keywords from the
-- provider's name, organization and categories, and the provider had no say in any of
-- it. These four columns are all OVERRIDES: NULL means "use the composed value", so
-- clearing a field restores the default rather than blanking the tag. That is why none
-- of them carries a DEFAULT.
--
-- Lengths are enforced in `services/providerSeo.ts` rather than as CHECK constraints:
-- the caps are advisory SEO limits (60 / 160 characters) that will be retuned, and a
-- constraint would turn a retune into a migration. TEXT here, validation there.

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "seoKeywords" TEXT,
ADD COLUMN "slug" TEXT;

-- CreateIndex: the slug is an address, so it has to be unique across every provider.
-- The service also refuses reserved words (route segments, all 15 locale codes) and
-- non-ASCII, but uniqueness is the one rule that cannot be checked without the table —
-- two providers can pass validation simultaneously and only the index stops them.
-- `providerSeo.ts` catches the resulting P2002 and answers 409.
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");
