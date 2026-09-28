-- Organizations carry no email. Nothing verified it and nothing sent to it; an organization
-- is reached through its providers, whose own published address is Provider.publicEmail.
ALTER TABLE "Organization" DROP COLUMN "email";
