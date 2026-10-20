-- Photo imports read per provider — the meter behind `Entitlements.photoImportsPerDay`.
-- One row per photo Gemini read; nothing about the photo itself is stored.

CREATE TABLE "PhotoImport" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoImport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhotoImport_providerId_createdAt_idx" ON "PhotoImport"("providerId", "createdAt");

ALTER TABLE "PhotoImport" ADD CONSTRAINT "PhotoImport_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
