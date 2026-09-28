-- Whether a provider's contact phone appears on their public page.
--
-- Default true: every provider on the system today publishes their number when set, and
-- flipping that for them would silently strip Call buttons and tel: links overnight.
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "phoneVisible" BOOLEAN NOT NULL DEFAULT true;
