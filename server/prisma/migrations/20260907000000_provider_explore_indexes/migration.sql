-- CreateIndex: Explore's default "recommended" ordering (available desc, updatedAt desc)
CREATE INDEX "Provider_listed_available_updatedAt_idx" ON "Provider"("listed", "available", "updatedAt");

-- CreateIndex: Explore's A-Z / Z-A name ordering
CREATE INDEX "Provider_listed_lastName_firstName_idx" ON "Provider"("listed", "lastName", "firstName");
