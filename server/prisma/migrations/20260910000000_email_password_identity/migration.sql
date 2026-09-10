-- Replace phone+OTP identity with email+password and Google OAuth.
--
-- Phone stays a mandatory registration field but is no longer identity and is never
-- verified. `User.email` becomes the login handle; `passwordHash` and `googleId` become
-- the two credentials.
--
-- Written by hand for the same reason `20260905000000_consumer_name_split_and_email` was:
-- the generated version cannot express the citext extension, the two CHECK constraints or
-- the purge below, and `prisma migrate dev` would have emitted an
-- `ADD COLUMN "email" TEXT NOT NULL` that fails outright on any non-empty table.
--
-- **This migration is deliberately destructive.** Every existing account is keyed on a
-- phone number and holds a bcrypt'd OTP as its only credential, with no identity email to
-- derive one from — there is nothing to carry forward, so there is no backfill to write.
-- Nothing is deployed; `pnpm db:setup` re-creates all of it.
--
-- The purge happens *here* rather than by asking developers to run `prisma migrate reset`
-- because `scripts/postinstall.mjs` runs `migrate deploy` on every `pnpm install`. A
-- migration that throws on a populated dev database is recorded as failed and blocks every
-- migration after it until someone runs `migrate resolve` by hand.

-- 1. Case-insensitive text, for the identity column.
--
--    Must be the first statement: `prisma migrate dev` replays these files into a fresh
--    shadow database, and the first CITEXT below fails there without it.
--
--    A domain type rather than an app-code lowercasing rule, because routes in this
--    codebase call Prisma directly — there is no repository layer a normalise-on-write
--    rule could be enforced in, so `Alex@x.com` would eventually become a second account
--    beside `alex@x.com`. Same reasoning that put `appointment_actor_present` in SQL.
CREATE EXTENSION IF NOT EXISTS citext;

-- 2. Purge. Order is forced by the foreign keys: Review and Appointment both hold
--    `Restrict` references to Consumer, so they must go before the User delete cascades
--    into it. Organization, Category and Service survive — Service cascades with its
--    Provider, and the seed's `findFirst`-on-name reuses the organizations.
DELETE FROM "Review";
DELETE FROM "Appointment";
DELETE FROM "FavoriteProvider";
DELETE FROM "User";

-- 3. Identity and credentials on User. `email` is NOT NULL with no default, which is safe
--    only because step 2 emptied the table.
CREATE TYPE "AuthProvider" AS ENUM ('local', 'google');

ALTER TABLE "User"
  ADD COLUMN "email"                      CITEXT NOT NULL,
  ADD COLUMN "emailVerifiedAt"            TIMESTAMP(3),
  ADD COLUMN "passwordHash"               TEXT,
  ADD COLUMN "googleId"                   TEXT,
  ADD COLUMN "authProvider"               "AuthProvider" NOT NULL DEFAULT 'local',
  ADD COLUMN "tokenVersion"               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failedLoginCount"           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failedLoginWindowStartedAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetTokenHash"     TEXT,
  ADD COLUMN "passwordResetExpiresAt"     TIMESTAMP(3);

-- 4. The email-verification pair is renamed, not replaced: it already holds a SHA-256 of a
--    32-byte link token, and it now serves registration verification and change-email
--    alike. "Otp" was always the wrong word for it — the column comment said as much.
ALTER TABLE "User" RENAME COLUMN "emailOtpHash"      TO "emailVerifyTokenHash";
ALTER TABLE "User" RENAME COLUMN "emailOtpExpiresAt" TO "emailVerifyExpiresAt";

ALTER TABLE "User" ALTER COLUMN "pendingEmail" TYPE CITEXT;

-- 5. Phone is no longer identity, and OTP is gone entirely — `lib/otp.ts` goes with it.
DROP INDEX "User_phoneCode_phoneNumber_key";

ALTER TABLE "User"
  DROP COLUMN "phoneCode",
  DROP COLUMN "phoneNumber",
  DROP COLUMN "otpHash",
  DROP COLUMN "otpExpiresAt",
  DROP COLUMN "pendingPhoneCode",
  DROP COLUMN "pendingPhoneNumber",
  DROP COLUMN "pendingPhoneOtpHash",
  DROP COLUMN "pendingPhoneOtpExpiresAt";

-- 6. Both token hashes are UNIQUE rather than merely indexed. Each is consumed by an
--    *unauthenticated* link — verify from the signup email, reset from the reset email —
--    so the row can only be found by hash. Unique makes that a `findUnique`: one row, no
--    ambiguity. 32 random bytes cannot collide, and Postgres permits any number of NULLs
--    in a unique index, so idle accounts are unaffected.
CREATE UNIQUE INDEX "User_email_key"                  ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key"               ON "User"("googleId");
CREATE UNIQUE INDEX "User_emailVerifyTokenHash_key"   ON "User"("emailVerifyTokenHash");
CREATE UNIQUE INDEX "User_passwordResetTokenHash_key" ON "User"("passwordResetTokenHash");

-- 7. Two invariants Prisma cannot express, in the database for the same reason
--    `appointment_actor_present` is: routes write through Prisma directly, so a rule that
--    lives only in a route is one forgotten line from being false.
--
--    (a) A verification token must name the address it verifies. Registration writes the
--        signup address to *both* `email` and `pendingEmail`, which is what makes confirm
--        one unconditional path — copy `pendingEmail` onto `email`, stamp the timestamp,
--        clear the token — shared by signup verification and change-email. This CHECK is
--        what stops a token outliving its subject and confirming nothing.
ALTER TABLE "User" ADD CONSTRAINT "user_email_verify_token_has_pending"
  CHECK ("emailVerifyTokenHash" IS NULL OR "pendingEmail" IS NOT NULL);

--    (b) Every account must be able to authenticate somehow. A row with neither a password
--        nor a Google identity is unreachable: nobody can sign in to it, and nothing will
--        ever delete it. The one flow this constrains is "unlink Google from a
--        password-less account", which must set a password first — correct behaviour.
ALTER TABLE "User" ADD CONSTRAINT "user_credential_present"
  CHECK ("passwordHash" IS NOT NULL OR "googleId" IS NOT NULL);

-- 8. Phone moves onto the profiles, beside the `country` picked on the same field.
--    NOT NULL with no default, safe only because step 2 emptied both tables.
--
--    Two columns rather than one shared one on `User` because the two are published
--    differently: `mapProviderDetails` puts a provider's number on the *public*
--    `GET /providers/:id` payload, while a consumer's reaches only the provider they
--    booked, through `mapProviderBooking`. One shared column published the personal number
--    of anyone holding both profiles.
--
--    Deliberately **not** unique — the old `@@unique` existed only because phone was the
--    identity. A clinic line shared by four providers is ordinary, and a unique constraint
--    on an unverified field would reintroduce an enumeration oracle.
ALTER TABLE "Provider"
  ADD COLUMN "phoneCode"   INTEGER NOT NULL,
  ADD COLUMN "phoneNumber" BIGINT  NOT NULL,
  ADD COLUMN "publicEmail" TEXT;

ALTER TABLE "Consumer"
  ADD COLUMN "phoneCode"   INTEGER NOT NULL,
  ADD COLUMN "phoneNumber" BIGINT  NOT NULL;

-- 9. Email leaves both profile tables. It was never unique on either, so one person
--    holding both profiles could carry two different *verified* addresses — which is
--    exactly what stopped email from being an identity. `User.email` is the single answer
--    now, read through the relation.
--
--    `Provider.publicEmail` above is its replacement for the one thing the column was
--    genuinely doing: a published `mailto:` on the public profile page and the `email`
--    field in the JSON-LD. Unverified and non-unique, so writing it from
--    `PUT /provider-profile` is harmless — writing the *identity* email from there was an
--    account-takeover vector.
ALTER TABLE "Provider" DROP COLUMN "email", DROP COLUMN "emailVerifiedAt";
ALTER TABLE "Consumer" DROP COLUMN "email", DROP COLUMN "emailVerifiedAt";

-- 10. Guest bookings now require the email too. `parseGuest` in `routes/appointments.ts`
--     has always rejected a guest without one, so this only moves the existing rule
--     somewhere a forgotten validation cannot skip it — and it is what makes `guestEmail`
--     a well-defined handle for recognising a guest who later registers, now that accounts
--     are keyed on email rather than phone.
ALTER TABLE "Appointment" DROP CONSTRAINT "appointment_actor_present";

ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_actor_present"
  CHECK (
    "consumerId" IS NOT NULL
    OR (
      "guestFirstName"   IS NOT NULL
      AND "guestLastName"    IS NOT NULL
      AND "guestPhoneNumber" IS NOT NULL
      AND "guestEmail"       IS NOT NULL
    )
  );
