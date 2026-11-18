-- The AI assistant, rebuilt as a chat, and the schedule it edits.
--   * The retired profile assistant goes: its run meter and its auto-open stamp.
--   * `Provider.specialDates` — dates that do not follow the weekly hours (closed, or own hours).
--   * `Provider.visitorAssistantEnabled` — the public page's assistant switch (Premium).
--   * `AssistantMessage` — a provider's chat history; `AssistantUsage` — the daily meter for
--     both assistants, kept apart from the history so clearing the chat refills nothing.

DROP TABLE "ProfileAssistantRun";
ALTER TABLE "Provider" DROP COLUMN "assistantSeenAt";

ALTER TABLE "Provider" ADD COLUMN "specialDates" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Provider" ADD COLUMN "visitorAssistantEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "AssistantRole" AS ENUM ('user', 'model');
CREATE TYPE "AssistantProposalStatus" AS ENUM ('pending', 'applied', 'partial', 'dismissed');
CREATE TYPE "AssistantKind" AS ENUM ('provider', 'visitor');

CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "role" "AssistantRole" NOT NULL,
    "text" TEXT NOT NULL,
    "proposal" JSONB,
    "proposalStatus" "AssistantProposalStatus",
    "outcome" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantMessage_providerId_createdAt_idx" ON "AssistantMessage"("providerId", "createdAt");

ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AssistantUsage" (
    "providerId" TEXT NOT NULL,
    "kind" "AssistantKind" NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssistantUsage_pkey" PRIMARY KEY ("providerId", "kind", "day")
);

ALTER TABLE "AssistantUsage" ADD CONSTRAINT "AssistantUsage_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
