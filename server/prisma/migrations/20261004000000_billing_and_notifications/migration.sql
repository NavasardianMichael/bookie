-- Paddle subscriptions, the Telegram notification channel, appointment reminders and the
-- private calendar feed (docs/BILLING.md, docs/PADDLE_SETUP.md, docs/NOTIFICATIONS.md).

-- A Paddle subscription's status, mirrored by `POST /billing/webhook`. Entitlements still
-- read only `plan` + `planExpiresAt`, which the webhook writes from the same snapshot.
CREATE TYPE "BillingStatus" AS ENUM ('active', 'trialing', 'past_due', 'paused', 'canceled');

-- Telegram: the linked chat, and the one live Connect token (hashed), on the User — one
-- person, one Telegram, whichever workspace a notice is about.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT,
ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT,
ADD COLUMN IF NOT EXISTS "telegramLinkedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "telegramLinkTokenHash" TEXT,
ADD COLUMN IF NOT EXISTS "telegramLinkExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramChatId_key" ON "User"("telegramChatId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramLinkTokenHash_key" ON "User"("telegramLinkTokenHash");

-- Billing bookkeeping. Every existing provider has none of it and keeps exactly the plan an
-- admin assigned; `calendarFeedVersion` starts every feed URL at version 0.
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "paddleCustomerId" TEXT,
ADD COLUMN IF NOT EXISTS "paddleSubscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "billingStatus" "BillingStatus",
ADD COLUMN IF NOT EXISTS "billingPeriodEndsAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "billingCancelsAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "billingEventAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "calendarFeedVersion" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "Provider_paddleSubscriptionId_key" ON "Provider"("paddleSubscriptionId");
CREATE INDEX IF NOT EXISTS "Provider_paddleCustomerId_idx" ON "Provider"("paddleCustomerId");

-- Reminder stamps, claimed by compare-and-set so each side is reminded once. Null on every
-- existing row: bookings already on the calendar are reminded like new ones.
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "providerRemindedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "bookerRemindedAt" TIMESTAMP(3);

-- The reminder job's sweep: live bookings starting within the next day, across providers.
CREATE INDEX IF NOT EXISTS "Appointment_status_startAt_idx" ON "Appointment"("status", "startAt");
