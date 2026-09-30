-- Drop Provider.publicEmail. The login identity (User.email) is the only email a
-- provider has, and it is what the public profile shows.
ALTER TABLE "Provider" DROP COLUMN IF EXISTS "publicEmail";
