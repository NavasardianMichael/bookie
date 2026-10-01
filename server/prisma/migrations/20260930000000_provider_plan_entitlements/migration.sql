-- Plans and entitlements: what a provider's plan allows, read through
-- `services/plans.ts#getEntitlements` (see docs/BILLING.md).
--
-- `planExpiresAt` is when a paid plan lapses back to `free` — a trial, a founding offer, and
-- later a Paddle billing period. Read lazily on every entitlement check rather than swept by
-- a job, because this API has no scheduler and must stay a single process. Null means no end,
-- so every provider today keeps exactly the plan they have.
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);

-- The two monthly booking-allowance emails (80% and 100%). A notice counts as sent for the
-- current month when its stamp is on or after the month's start (UTC); the stamp is claimed
-- with a compare-and-set, so two concurrent bookings cannot both send it.
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "bookingCapWarnedAt" TIMESTAMP(3);
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "bookingCapReachedAt" TIMESTAMP(3);

-- CreateIndex: the monthly allowance counts one provider's bookings by creation time, on
-- every public page view of a capped provider and on every booking made with one.
CREATE INDEX IF NOT EXISTS "Appointment_providerId_createdAt_idx" ON "Appointment"("providerId", "createdAt");
