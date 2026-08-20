# Development credentials

Use these accounts for local testing against a seeded database (`pnpm db:setup` or `pnpm install` with Postgres running).

## OTP

All seeded users accept this one-time code in development:

| Field | Value |
| --- | --- |
| **OTP** | `123456` |

The API also logs a fresh OTP to the console when you call `POST /identity/send-otp`. In dev, `123456` always works for seeded phones even after a new OTP is sent.

## Provider login

| Field | Value |
| --- | --- |
| **Phone** | `+37477000100` |
| **OTP** | `123456` |
| **userType** | `provider` |

Use this on the auth flow after choosing **Provider** as the account type. The login request body must include matching `userType`:

```json
{
  "phone": "+37477000100",
  "otp": "123456",
  "userType": "provider"
}
```

## Consumer login

| Field | Value |
| --- | --- |
| **Phone** | `+37477000201` |
| **OTP** | `123456` |
| **userType** | `consumer` |

Use this after choosing **Consumer** as the account type:

```json
{
  "phone": "+37477000201",
  "otp": "123456",
  "userType": "consumer"
}
```

## Notes

- `userType` must match the role you selected before the OTP step; otherwise login may fail or create the wrong profile stub.
- These credentials are for **local development only**. Do not use `123456` or weak JWT secrets in production.
- If login fails, ensure Postgres is seeded: `pnpm db:up` then `pnpm db:setup`.
