# Development credentials

Use these accounts for local testing against a seeded database (`pnpm db:setup` or `pnpm install` with Postgres running).

## OTP

All seeded users accept this one-time code in development:

| Field | Value |
| --- | --- |
| **OTP** | `123456` |

The API also logs a fresh OTP to the console when you call `POST /identity/send-otp`. In dev, `123456` always works for seeded phones even after a new OTP is sent.

## Signing in through the UI

Both seeded accounts sign in at **`/auth/phone-number-input`** — enter the phone, then the
OTP. **Do not pick an account type first:** sign-in sends no `userType`, and the server reads
the role off the profile that already exists. Choosing a type starts *registration*, which is
a different, role-specific screen.

| Account | Phone | Role resolved as |
| --- | --- | --- |
| Provider | `+37477000100` | `provider` |
| Consumer | `+37477000201` | `consumer` |

## Calling the API directly

`phone` is an **object**, not a formatted string — earlier versions of this file showed
`"phone": "+37477000100"`, which the route rejects.

```jsonc
// Sign-in — no userType, no profile.
POST /identity/login
{
  "phone": { "code": 374, "number": 77000100 },
  "otp": "123456"
}
```

```jsonc
// Registration — userType and profile are applied on create only.
POST /identity/login
{
  "phone": { "code": 374, "number": 77000999 },
  "otp": "123456",
  "userType": "provider",
  "profile": {
    "firstName": "Alex",
    "lastName": "Morgan",
    "email": "alex@company.com",
    "organizationName": "Acme Services"
  }
}
```

Both return `{ "role": …, "profileId": …, "isNewUser": … }` and set the `bookie_session`
cookie. See [DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md) for the full contract.

## Notes

- `userType` is only needed when **creating** an account. Sending it for an existing user of
  the other role would create a second profile for that same phone number.
- A phone number with no account and no `userType` returns `404` rather than inventing a profile.
- These credentials are for **local development only**. Do not use `123456` or weak JWT secrets in production.
- If login fails, ensure Postgres is seeded: `pnpm db:up` then `pnpm db:setup`.
