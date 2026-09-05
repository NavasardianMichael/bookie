-- Country a consumer selected on the phone field when registering, ISO 3166-1 alpha-2.
--
-- Nullable, and deliberately not backfilled: every account created before this column
-- existed has no answer, and it cannot be derived from the dialling code already on
-- `User.phoneCode` — +1 is the US, Canada and ~20 more, +7 is Russia and Kazakhstan.
-- A wrong country is worse than a missing one.
--
-- Mirrors the existing `Provider.country`, so both roles store it the same way.
ALTER TABLE "Consumer" ADD COLUMN "country" TEXT;
