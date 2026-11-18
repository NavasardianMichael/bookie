-- The provider's AI assistant gets several chats instead of one.
--   * `AssistantConversation` — one chat: its title (the first message, shortened) and last activity.
--   * `AssistantMessage.conversationId` — every message belongs to one; deleting the chat deletes them.
-- Existing history becomes one chat per provider, titled from its first message.

CREATE TABLE "AssistantConversation" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantConversation_providerId_updatedAt_idx" ON "AssistantConversation"("providerId", "updatedAt");

ALTER TABLE "AssistantConversation" ADD CONSTRAINT "AssistantConversation_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AssistantConversation" ("id", "providerId", "title", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    m."providerId",
    COALESCE(
        (SELECT LEFT(regexp_replace(f."text", '\s+', ' ', 'g'), 60)
           FROM "AssistantMessage" f
          WHERE f."providerId" = m."providerId" AND f."role" = 'user' AND f."text" <> ''
          ORDER BY f."createdAt" ASC
          LIMIT 1),
        ''
    ),
    MIN(m."createdAt"),
    MAX(m."createdAt")
FROM "AssistantMessage" m
GROUP BY m."providerId";

ALTER TABLE "AssistantMessage" ADD COLUMN "conversationId" TEXT;

UPDATE "AssistantMessage" m
   SET "conversationId" = c."id"
  FROM "AssistantConversation" c
 WHERE c."providerId" = m."providerId";

ALTER TABLE "AssistantMessage" ALTER COLUMN "conversationId" SET NOT NULL;

DROP INDEX "AssistantMessage_providerId_createdAt_idx";
CREATE INDEX "AssistantMessage_conversationId_createdAt_idx" ON "AssistantMessage"("conversationId", "createdAt");

ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
