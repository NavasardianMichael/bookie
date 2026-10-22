-- The public provider page moves to `/p/<slug ?? id>`. Two things back it:
--   * `ProviderSlugHistory` keeps a renamed slug resolving to its provider.
--   * `seoUpdatedAt` / `seoFingerprint` give the sitemap a `lastmod` that moves only when
--     something search engines see has changed. Backfilled from `updatedAt`, the best
--     approximation available for rows written before the fingerprint existed.

ALTER TABLE "Provider" ADD COLUMN "seoUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Provider" ADD COLUMN "seoFingerprint" TEXT;
UPDATE "Provider" SET "seoUpdatedAt" = "updatedAt";

CREATE TABLE "ProviderSlugHistory" (
    "slug" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSlugHistory_pkey" PRIMARY KEY ("slug")
);

CREATE INDEX "ProviderSlugHistory_providerId_idx" ON "ProviderSlugHistory"("providerId");

ALTER TABLE "ProviderSlugHistory" ADD CONSTRAINT "ProviderSlugHistory_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
