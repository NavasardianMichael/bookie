-- The provider's hours get a rule beside the weekly schedule: weekdays (as before), days of the
-- month with one set of hours, or specific dates only. Every existing provider keeps weekdays.
ALTER TABLE "Provider" ADD COLUMN "scheduleRule" JSONB NOT NULL DEFAULT '{"mode":"weekdays"}';
