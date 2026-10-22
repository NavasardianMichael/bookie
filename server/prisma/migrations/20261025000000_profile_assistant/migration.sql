-- The profile assistant: a provider describes their business in their own words and Gemini
-- drafts their workspace from it.
--   * `ProfileAssistantRun` meters `Entitlements.profileAssistantRunsPerDay` — one row per draft
--     generated; nothing the provider wrote is stored.
--   * `Provider.assistantSeenAt` decides whether the assistant opens by itself. Every provider
--     that already exists is stamped now, so only accounts created from here on are greeted.

ALTER TABLE "Provider" ADD COLUMN "assistantSeenAt" TIMESTAMP(3);
UPDATE "Provider" SET "assistantSeenAt" = CURRENT_TIMESTAMP;

CREATE TABLE "ProfileAssistantRun" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileAssistantRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfileAssistantRun_providerId_createdAt_idx" ON "ProfileAssistantRun"("providerId", "createdAt");

ALTER TABLE "ProfileAssistantRun" ADD CONSTRAINT "ProfileAssistantRun_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
