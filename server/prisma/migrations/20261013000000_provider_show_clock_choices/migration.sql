-- Whether the public booking page offers a time-zone list and a 12/24-hour switch.
-- One flag for both. Default on: every page already shows them, and a provider turns
-- them off together from the Availability tab.
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "showClockChoices" BOOLEAN NOT NULL DEFAULT true;
