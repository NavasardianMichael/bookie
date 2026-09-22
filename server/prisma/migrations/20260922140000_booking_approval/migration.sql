-- Booking approval: an opt-in gate between "submitted" and "on the calendar".

-- `pending` is added to the enum rather than replacing anything. Existing rows keep the
-- status they have; nothing is backfilled, because a booking already made under the old
-- rules was accepted the moment it was created and must not retroactively need a decision.
--
-- `IF NOT EXISTS` so re-running against a database that already took this value is a
-- no-op — `ALTER TYPE ... ADD VALUE` cannot run inside the implicit transaction a plain
-- failed migration would leave behind.
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'pending';

-- Default false: every provider on the system today has bookings land on the calendar
-- immediately, and flipping that for them would quietly stop their diary filling.
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "requiresBookingApproval" BOOLEAN NOT NULL DEFAULT false;
