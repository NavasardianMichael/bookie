-- The 12- or 24-hour clock a provider's times are printed on — the public page, the manage
-- link, booking emails and Telegram, and their own workspace. Chosen beside `timeZone` on
-- the Availability tab.
--
-- Nullable with no backfill: nobody has chosen yet, and a null keeps what each reader's
-- locale prints (`en` 12-hour, `hy` and `de` 24-hour) rather than forcing one convention on
-- every existing page.
CREATE TYPE "TimeFormat" AS ENUM ('h12', 'h24');

ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "timeFormat" "TimeFormat";
