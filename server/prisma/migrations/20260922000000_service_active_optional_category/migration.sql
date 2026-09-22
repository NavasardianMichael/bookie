-- Per-service pause: a provider can withdraw an offering without deleting it.
-- Existing rows were all live, so the default is true.
ALTER TABLE "Service" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- Title and duration are the only required fields now. The FK stays ON DELETE RESTRICT.
ALTER TABLE "Service" ALTER COLUMN "categoryId" DROP NOT NULL;
