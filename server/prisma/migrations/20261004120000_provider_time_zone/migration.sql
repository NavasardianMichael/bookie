-- The IANA zone a provider's `weekSchedule` is written in (`Asia/Yerevan`). The schedule is
-- wall-clock 'HH:mm' with no zone of its own, so until now every visitor's browser read the
-- hours in *its* zone: a booker abroad was offered times the provider does not keep, and
-- booking emails printed the API server's zone.
--
-- Nullable with no backfill: nothing on an existing row says where its provider is (`country`
-- is free of zones and several countries span many). A null zone keeps the old reading — the
-- viewer's own zone — until the provider confirms one on the Availability tab, which suggests
-- their device's zone. Stored canonical by `lib/time-zone.ts#toTimeZone`.
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "timeZone" TEXT;
