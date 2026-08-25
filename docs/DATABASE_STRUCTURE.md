# Bookie — Database & API

PostgreSQL schema managed by Prisma in [`server/prisma/schema.prisma`](../server/prisma/schema.prisma).

## Core models

| Model | Purpose |
| --- | --- |
| **User** | Phone identity (`phoneCode` + `phoneNumber`), OTP fields, optional 1:1 Consumer/Provider |
| **Category** | Service specialty (unique name) |
| **Organization** | Clinic / facility; M2M with Category |
| **Provider** | Professional profile, `weekSchedule` JSON, plan, optional organization |
| **Service** | Bookable offering (duration, price, category) |
| **Consumer** | Patient/client profile |
| **FavoriteProvider** | Consumer ↔ Provider favorites |
| **Appointment** | Booking with status enum and overlap index |
| **Review** | Rating 1–5 for provider and/or organization |

## Relationships

```
Consumer ←→ Appointment ←→ Provider
    ↓           ↓           ↓
  Review      Service    Organization
                ↑
            Category
```

## API envelope

All JSON responses use:

```json
{ "value": <T>, "error": null }
{ "value": null, "error": { "code": number, "message": string } }
```

## Routes (Express, default `:4142`)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/health` | public |
| POST | `/identity/send-otp` | public |
| POST | `/identity/login` | public (sets httpOnly cookie) |
| POST | `/identity/logout` | session |
| GET | `/providers`, `/providers/:id` | public |
| GET | `/providers/:id/availability?date=` | public |
| GET/PUT | `/provider-profile` | provider |
| POST/PUT/DELETE | `/providers/:providerId/services/...` | provider |
| GET | `/organizations`, `/organizations/:id` | public |
| GET | `/categories`, `/categories/:id` | public |
| GET | `/consumers`, `/consumers/:id` | public |
| GET/PUT | `/consumer-profile` | consumer |
| GET/POST/PATCH | `/appointments` | session |

## Local setup

1. Copy env: `cp server/.env.example server/.env`
2. Run `pnpm install` — generates Prisma client; applies migrations and seed when Postgres is up
3. Start Postgres if needed: `pnpm db:up` (requires Docker Desktop), then `pnpm db:setup`
4. Run API + web: `pnpm watch`
5. Frontend env: copy `.env.example` → `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4142`

**Dev login:** see [DEV_CREDS.md](DEV_CREDS.md) for seeded provider/consumer phones and OTP.

## Project layout

```
server/
  prisma/schema.prisma
  prisma/seed.ts
  src/
    app.ts, index.ts
    routes/       # Express routers
    services/     # Appointments, availability
    mappers/      # Prisma → frontend DTOs
    middleware/   # Auth, errors
docker-compose.yml
```
