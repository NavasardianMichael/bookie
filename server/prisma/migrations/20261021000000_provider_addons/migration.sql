-- Add-ons: single features and capacity packs sold monthly beside the plans
-- (docs/BILLING.md → *Add-ons*). No existing provider holds one, so nothing is backfilled:
-- every entitlement stays exactly what the plan alone grants until a row is written.

CREATE TYPE "Addon" AS ENUM ('customSlug', 'telegramNotifications', 'calendarFeed', 'removeBranding', 'extraServices', 'extraBookings');

-- The webhook replaces only `paddle` rows, an admin only `admin` rows.
CREATE TYPE "AddonSource" AS ENUM ('paddle', 'admin');

CREATE TABLE "ProviderAddon" (
    "providerId" TEXT NOT NULL,
    "addon" "Addon" NOT NULL,
    "source" "AddonSource" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderAddon_pkey" PRIMARY KEY ("providerId","addon","source")
);

ALTER TABLE "ProviderAddon" ADD CONSTRAINT "ProviderAddon_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
