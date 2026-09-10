# Development credentials

Use these accounts for local testing against a seeded database (`pnpm db:setup`, or
`pnpm install` with Postgres running).

## Password

Every seeded account shares one password, hashed by `server/src/lib/password.ts` — the same
argon2id path `POST /identity/register` uses, so a seeded account is indistinguishable from
a registered one.

| Field | Value |
| --- | --- |
| **Password** | `bookie-dev-1234` |

Seeded accounts are created **already verified** (`emailVerifiedAt` is stamped).
`middleware/auth.ts` refuses a session for an unverified account on every authenticated
request, so without that stamp a seeded user could log in and then fail every call after it.

## Signing in through the UI

Both accounts sign in at **`/auth/sign-in`** — email, then password. There is no account-type
choice: the role is read off whichever profile the account already has, and a user holding
both resolves to **provider**. Picking a type starts *registration*, which is a different
screen.

| Account | Email | Role resolved as |
| --- | --- | --- |
| Provider | `anna.petrosyan@bookie.am` | `provider` |
| Consumer | `alex.consumer@bookie.am` | `consumer` |

Every other seeded provider follows the same `firstname.lastname@bookie.am` shape — for
example `david.hakobyan@bookie.am`.

## Emails in development

There is no SMTP locally. `MAIL_API_KEY` ships empty in `server/.env.example`, so
`lib/mail.ts` prints instead of sending and the flow still completes:

- **Verification link** — printed to the API console. Registration does *not* sign you in;
  an unverified account cannot hold a session, so the funnel continues from that link.
- **Password reset**, **email-change** and the notice mails behave the same way.

A seeded account never needs any of this — it is verified already.

## Google sign-in

Disabled unless `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` are
all set. `GET /health` reports `{ "google": false }` when it is off, which is what the web
app checks before rendering the button; `GET /identity/google` redirects back with
`?error=google_unavailable` rather than failing.

Filling those in is optional for local work — email/password covers the whole funnel.

## Calling the API directly

```jsonc
// Sign-in.
POST /identity/login
{ "email": "anna.petrosyan@bookie.am", "password": "bookie-dev-1234" }
```

```jsonc
// Registration. Does not sign you in — it mails a verification link.
// `phone` is an object and is mandatory, but it is profile data now, not identity:
// it is never verified and has no unique constraint.
POST /identity/register
{
  "role": "provider",
  "email": "alex@company.com",
  "password": "a-strong-password",
  "phone": { "code": 374, "number": 77000201 },
  "profile": {
    "firstName": "Alex",
    "lastName": "Morgan",
    "country": "AM",
    "organizationName": "Acme Services"
  }
}
```

Login returns `{ role, profileId, userId, firstName, lastName, image? }` and sets the
`bookie_session` cookie. See [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md) for the full
route list.

## Notes

- **Email is the identity**, stored `citext` so the unique index is case-insensitive in the
  database rather than only in whichever route remembered to lowercase.
- **Phone moved onto the profiles** (`Provider.phoneCode`/`phoneNumber`, and the same on
  `Consumer`). It is mandatory at registration, never verified, and deliberately **not**
  unique — a clinic line shared by four providers is ordinary.
- The seed is re-runnable (`pnpm install` re-seeds), and re-hashes the password on every
  run, so changing `DEV_PASSWORD` in `server/prisma/seed.ts` takes effect on an existing
  database.
- These credentials are **local development only**. Never ship `bookie-dev-1234` or a weak
  `JWT_SECRET`.
- If login fails, check Postgres is up and seeded: `pnpm db:up` then `pnpm db:setup`.
