-- AlterTable User: pending phone/email OTP for identity changes
ALTER TABLE "User" ADD COLUMN "pendingPhoneCode" INTEGER,
ADD COLUMN "pendingPhoneNumber" BIGINT,
ADD COLUMN "pendingPhoneOtpHash" TEXT,
ADD COLUMN "pendingPhoneOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN "pendingEmail" TEXT,
ADD COLUMN "emailOtpHash" TEXT,
ADD COLUMN "emailOtpExpiresAt" TIMESTAMP(3);

-- AlterTable Provider: listing, draft, prefs, payment
ALTER TABLE "Provider" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "listed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "draft" JSONB,
ADD COLUMN "emailNotificationPrefs" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "paymentInfo" JSONB;

-- AlterTable Consumer: description, prefs, payment, email verification
ALTER TABLE "Consumer" ADD COLUMN "description" TEXT,
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "emailNotificationPrefs" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "paymentInfo" JSONB;
