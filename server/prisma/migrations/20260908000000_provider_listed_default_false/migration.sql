-- New provider accounts start unlisted. Existing rows keep their current `listed` value.
ALTER TABLE "Provider" ALTER COLUMN "listed" SET DEFAULT false;
