-- Per-service availability: weekdays with hours, days of the month, or specific dates,
-- always clamped to the provider's own hours. NULL is "whenever the provider is open",
-- which is what every existing service was, so no backfill.

ALTER TABLE "Service" ADD COLUMN "availability" JSONB;
