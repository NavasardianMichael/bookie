-- Provider contact phone is optional at registration. Consumers keep NOT NULL.
ALTER TABLE "Provider" ALTER COLUMN "phoneCode" DROP NOT NULL;
ALTER TABLE "Provider" ALTER COLUMN "phoneNumber" DROP NOT NULL;
