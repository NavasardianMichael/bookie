# Bookie

Healthcare booking platform — Next.js frontend + Express/Prisma API + PostgreSQL.

## Stack

- **Web:** Next.js 16, React 19, Ant Design, Tailwind, Zustand
- **API:** Express 5, Prisma, JWT session cookies
- **DB:** PostgreSQL 16 (Docker)

## Quick start

```bash
pnpm install        # generates Prisma client; migrates + seeds when Postgres is up
cp .env.example .env.local
cp server/.env.example server/.env

pnpm db:up          # start Postgres (Docker required)
pnpm watch          # Next.js :4141 + API :4142
```

`pnpm install` runs migrations and seed automatically when `server/.env` exists and Postgres is reachable. If the database is down, install still succeeds — run `pnpm db:up` then `pnpm db:setup` once.

Pre-commit hooks run `eslint --fix` on staged files (including import sorting).

Open [http://localhost:4141](http://localhost:4141).

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Next.js only (port 4141) |
| `pnpm server:dev` | API only (port 4142) |
| `pnpm watch` | Both in parallel |
| `pnpm db:up` / `pnpm db:down` | Docker Postgres |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed sample data |
| `pnpm lint` | ESLint |
| `pnpm lint-fix` | ESLint with auto-fix (imports, etc.) |
| `pnpm typecheck` | TypeScript |

## Documentation

- [DEV_CREDS.md](./DEV_CREDS.md) — local login credentials (OTP, provider/consumer phones)
- [DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md) — schema and API routes
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) — frontend upgrade notes and follow-ups

## Deploy notes

- Set strong `JWT_SECRET` and production `DATABASE_URL` in `server/.env`
- Set `CORS_ORIGIN` to your frontend URL
- Run `pnpm db:migrate` against the production database before starting the API
