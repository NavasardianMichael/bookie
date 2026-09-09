-- Appointment price snapshot.
--
-- `durationMinutes` was already copied off the Service at booking time; price and
-- currency were not, so editing a service's price silently rewrote the price of every
-- booking already made against it. An appointment is a record of what was agreed, not
-- a view onto today's price list — and the provider analytics tab sums these columns,
-- so a mutable price would make last quarter's revenue change when a price does.
--
-- Column types mirror `Service.price` / `Service.currency` exactly. Storing minor units
-- instead would introduce a conversion, and a Decimal(10,2) scaled by 100 overflows
-- INTEGER at the top of its range.

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "price" DECIMAL(10,2),
ADD COLUMN "currency" TEXT;

-- Backfill from the joined Service.
--
-- These are TODAY's prices, not the prices that were agreed when each of these rows was
-- booked — that information was never recorded and cannot be recovered. Analytics over
-- appointments created before this migration inherits that approximation; everything
-- booked after it is exact.
UPDATE "Appointment" AS a
SET "price" = s."price",
    "currency" = s."currency"
FROM "Service" AS s
WHERE a."serviceId" = s."id"
  AND a."price" IS NULL;
