-- Provider ratings, reviews and moderation.
--
-- `Review` has existed since the init migration and was read by nothing — no route, no
-- service, no mapper. This migration is what turning it into a feature costs: the
-- moderation and reply columns it never had, the denormalised aggregate on `Provider`
-- that `docs/BACKLOG.md` named as the precondition for a rating sort, and the report
-- queue behind `/admin/reviews`.
--
-- Every statement has to tolerate a populated database: `scripts/postinstall.mjs` runs
-- `migrate deploy` on every `pnpm install`, and a migration that throws is recorded as
-- failed and blocks every migration after it until someone runs `migrate resolve` by
-- hand. That is why the CHECK below is preceded by a repair, and why `updatedAt` carries
-- a DEFAULT it does not strictly need.

-- 1. Moderation, the provider's reply, and an update timestamp.
--
--    `hiddenAt` rather than a delete. A report that turns out to be wrong has to be
--    reversible, and the row is the evidence for whichever way the decision went. Every
--    public read and every aggregate filters on `hiddenAt IS NULL`.
--
--    `updatedAt` keeps its DEFAULT after backfilling. Prisma's `@updatedAt` emits a bare
--    NOT NULL column, which cannot be added to a table that already has rows; the default
--    makes this safe on a dev database carrying the seeded reviews, and leaving it costs
--    nothing because Prisma writes the column on every update anyway.
ALTER TABLE "Review" ADD COLUMN "hiddenAt" TIMESTAMP(3),
ADD COLUMN "hiddenReason" TEXT,
ADD COLUMN "providerReply" TEXT,
ADD COLUMN "providerRepliedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. The rating bound, in the database rather than only in the route that writes it.
--
--    Prisma cannot express a CHECK — the same reason `appointment_actor_present` lives in
--    SQL. It matters more here than for an ordinary column because `ratingSum` and the
--    ranking are computed from this value: one out-of-range write would not be a bad row,
--    it would be a wrong sort order for the provider it belongs to.
--
--    The repair runs first so the constraint cannot fail on data written before it
--    existed. Nothing in the seed is out of range; this is for hand-edited dev databases.
UPDATE "Review" SET "rating" = LEAST(GREATEST("rating", 1), 5)
WHERE "rating" < 1 OR "rating" > 5;

ALTER TABLE "Review" ADD CONSTRAINT "review_rating_range"
  CHECK ("rating" BETWEEN 1 AND 5);

-- 3. The public list's only ordering: one provider's visible reviews, newest first.
--    Without it that is a sequential scan of every review in the table.
CREATE INDEX "Review_providerId_hiddenAt_createdAt_idx"
  ON "Review"("providerId", "hiddenAt", "createdAt");

-- 4. Two delete rules corrected.
--
--    `consumerId` is a required relation, so Prisma defaulted it to RESTRICT — which
--    means `prisma.user.delete` in `routes/identity.ts` starts failing for any consumer
--    who has ever left a review. Account deletion has to keep working, and deleting the
--    account should take what they wrote with it, so: CASCADE.
--
--    `providerId` was SET NULL, which leaves a review attached to nobody — no query
--    filters on it, no page can render it, and it still occupies a row. CASCADE too.
--
--    `organizationId` and `appointmentId` keep SET NULL deliberately. An organization
--    review survives the organization being merged away (see the dedupe migration), and
--    a review must outlive the appointment that earned it or a provider could erase
--    criticism by deleting the booking.
ALTER TABLE "Review" DROP CONSTRAINT "Review_consumerId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_consumerId_fkey"
  FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review" DROP CONSTRAINT "Review_providerId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. The denormalised aggregate.
--
--    This is the column `docs/BACKLOG.md` said a rating sort was blocked on: Prisma's
--    `orderBy` cannot compute, so a rating ordering has to read an indexed column or be
--    an AVG over every provider's reviews on every page render.
--
--    `ratingSum` is the integer source of truth and `ratingAvg` derives from it, so the
--    recompute that runs on every review write cannot accumulate float drift.
--
--    `ratingScore` defaults to 4 — not 0 — because that is what the Bayesian formula in
--    `services/reviews.ts` yields at zero reviews: (10*4.0 + 0) / (10 + 0). An unrated
--    provider ranks mid-pack rather than below every rated one, which is the only way a
--    provider who just joined is ever seen.
ALTER TABLE "Provider" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ratingSum" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "ratingScore" DOUBLE PRECISION NOT NULL DEFAULT 4;

-- 6. Backfill from the reviews that already exist.
--
--    Without this every seeded provider reads as unrated until someone writes a review,
--    and the two rows `prisma/seed.ts` has been creating since the init migration would
--    render as zero stars on a database that has held them for months.
--
--    The arithmetic is the same formula `bayesianScore` implements; the constants are
--    repeated here rather than imported because SQL cannot import. They are pinned
--    together by `tests/unit/server/reviews.spec.ts`.
UPDATE "Provider" p
SET "ratingCount" = agg.count,
    "ratingSum"   = agg.total,
    "ratingAvg"   = agg.total::DOUBLE PRECISION / agg.count,
    "ratingScore" = (10 * 4.0 + agg.total)::DOUBLE PRECISION / (10 + agg.count)
FROM (
  SELECT "providerId", COUNT(*) AS count, SUM("rating") AS total
  FROM "Review"
  WHERE "providerId" IS NOT NULL AND "hiddenAt" IS NULL
  GROUP BY "providerId"
) agg
WHERE p."id" = agg."providerId";

-- 7. Explore's third ordering. The two existing indexes carry a comment arguing against
--    a third as "a write cost for the least-used control"; `ratingScore` is the opposite
--    of that — it is the second term of `recommended`, Explore's default sort, so it is
--    read on nearly every public page view and written only when a review changes.
CREATE INDEX "Provider_listed_ratingScore_idx" ON "Provider"("listed", "ratingScore");

-- 8. The report queue.
--
--    Persisted, where a contact message deliberately is not. `routes/contact.ts` argues a
--    table would duplicate an admin inbox that nothing would ever read against — and that
--    argument turned on there being no admin surface. `/admin/reviews` is that surface,
--    and it has to know which reports are still open, so the email is the alert and this
--    is the queue.
--
--    Reporting is provider-only and bounded to the page the review sits on, so there is
--    no reporter id in the request to aim and no way to report a review written about
--    someone else.
CREATE TYPE "ReviewReportStatus" AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReviewReportStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- The admin queue's ordering: open reports, oldest first.
CREATE INDEX "ReviewReport_status_createdAt_idx" ON "ReviewReport"("status", "createdAt");

ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
