# Deployment

Push to `master` → GitHub Actions builds → two tarballs land on the server → symlink
flip → `systemctl restart` → health check.

## Shape

```
                 bookie.mnavasardian.com ──► nginx ──► 127.0.0.1:7004  bookie-web  (Next standalone)
                                          └─────► /_next/static/  from disk
             api.bookie.mnavasardian.com ──► nginx ──► 127.0.0.1:9004  bookie-api  (Express)
                                          └─────► /uploads/       from disk
                                                        │
                                                        ▼
                                          127.0.0.1:5004  Postgres (Docker)
```

Two origins, not one. The `bookie_session` cookie is host-only on the API origin,
`CORS_ORIGIN` names the web origin, and `GOOGLE_REDIRECT_URI` must point at the API host —
that is why the callback can set the cookie at all.

On-host layout:

```
$APP_DIR/                         e.g. /home/michael/apps/bookie
  web/releases/<sha>/             server.js · .next · public · node_modules
  web/current        -> releases/<sha>
  api/releases/<sha>/             dist · prisma · package.json · node_modules
  api/current        -> releases/<sha>
  shared/uploads/                 persistent — outside every release
  shared/.env.api                 mode 600, written by the deploy
  db/docker-compose.prod.yml
```

`WorkingDirectory` in both units points at `current`; systemd resolves the symlink at
start, so `systemctl restart` is what promotes a release.

## One-time server setup

```bash
# 1. directory tree (the `michael` user already exists)
sudo -u michael mkdir -p /home/michael/apps/bookie/{web/releases,api/releases,shared/uploads,db}

# 2. Node 24 + pnpm (pnpm is needed on the host: the API release installs there)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo corepack enable && sudo corepack prepare pnpm@10.28.2 --activate
# so a failed deploy can dump service logs
sudo usermod -aG systemd-journal michael

# 3. Postgres
sudo -u michael cp deployment/docker-compose.prod.yml /home/michael/apps/bookie/db/
# POSTGRES_* live in a compose env file, not an inline variable: compose reads a
# `.env` from its own directory, so a later `up -d` or a host reboot cannot come
# back up with different credentials than the volume was initialised with.
sudo -u michael cp deployment/db.env.example /home/michael/apps/bookie/db/.env
openssl rand -hex 32      # paste as POSTGRES_PASSWORD in that file
cd /home/michael/apps/bookie/db
sudo -u michael docker compose -f docker-compose.prod.yml up -d
# No manual schema work: `prisma migrate deploy` runs on every deploy, and the
# 20260910000000_email_password_identity migration creates the citext extension
# that User.email needs.

# 4. systemd units
sudo cp deployment/bookie-web.service deployment/bookie-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bookie-web bookie-api    # do not start yet — no release exists

# 5. let the deploy user restart exactly those two units
sudo tee /etc/sudoers.d/bookie-deploy >/dev/null <<'SUDOERS'
michael ALL=(root) NOPASSWD: /usr/bin/systemctl restart bookie-web, /usr/bin/systemctl restart bookie-api
SUDOERS
sudo visudo -c        # check `which systemctl` — it is /bin/systemctl on some distros
# sudoers matches the whole command line, so these two entries are all the deploy
# may run as root. `systemctl status` and `journalctl` need no sudo for reading.

# 6. nginx + TLS
# The API vhost is HTTPS-only and names files under
# /etc/letsencrypt/live/api.bookie.mnavasardian.com/ — enable it only after
# that cert exists, or nginx -t fails with BIO_new_file / No such file.
sudo cp deployment/bookie.mnavasardian.com.conf deployment/api.bookie.mnavasardian.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/bookie.mnavasardian.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d bookie.mnavasardian.com -d www.bookie.mnavasardian.com
# HTTP-01 for the API name: the API conf has no :80 block, so use certonly
# (webroot is served by whichever :80 default_server already has the ACME location).
sudo certbot certonly --webroot -w /var/www/html -d api.bookie.mnavasardian.com
sudo ln -s /etc/nginx/sites-available/api.bookie.mnavasardian.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 7. CI's SSH key
sudo -u michael mkdir -p /home/michael/.ssh
# append the public half of SSH_KEY to /home/michael/.ssh/authorized_keys

# 8. verify — as michael, NOT root: several checks are about what that user
#    can do, and root passes them spuriously
sudo -u michael bash deployment/preflight.sh /home/michael/apps/bookie
```

`preflight.sh` changes nothing. It checks the Node version against the units' `ExecStart`,
that pnpm and curl exist, that the directory tree is present and `shared/uploads` is
writable, that Postgres is up, reachable as the configured role, and published on
loopback only, that both
units are installed and enabled, that passwordless `systemctl restart` actually works, and
that nginx's config parses. Fix everything it reports before deploying — each failure is
something that otherwise surfaces halfway through a deploy, with a half-applied release.

The first deploy creates the release directories and starts both services.

## GitHub configuration

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Name             | Value                                     |
| ---------------- | ----------------------------------------- |
| `SSH_HOST`       | server hostname or IP                     |
| `SSH_USER`       | `michael`                                 |
| `SSH_KEY`        | private half of the deploy key (full PEM) |
| `SSH_PORT`       | optional, defaults to 22                  |
| `APP_DIR`        | `/home/michael/apps/bookie`               |
| `ENV_API_BASE64` | see below                                 |

**Variables** (same page → Variables tab) — these are _not_ secrets: both are inlined into
the browser bundle at build time, so they are public by construction.

| Name                   | Value                                 |
| ---------------------- | ------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | `https://api.bookie.mnavasardian.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://bookie.mnavasardian.com`     |

`ENV_API_BASE64` holds `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `MAIL_*` and
`GOOGLE_*` — the keys are documented in `server/.env.example`. Do **not** put `NODE_ENV`,
`PORT`, `HOST` or `UPLOAD_DIR` in it: the deploy strips and rewrites those four so they
cannot drift from the ports and paths the systemd units use.

For the Google credential, `server/.env.example` carries the full console walkthrough —
which scopes to request, and what to put in **Authorized redirect URIs** (one entry per
environment, pointing at the **API** host) and **Authorized JavaScript origins** (nothing:
this app never talks to Google from the browser).

Three values must match character for character or sign-in breaks in ways that look
unrelated to each other:

|                       | must equal                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `CORS_ORIGIN`         | the `NEXT_PUBLIC_SITE_URL` variable — `requireSameOrigin` compares them                                                           |
| `GOOGLE_REDIRECT_URI` | an Authorized redirect URI on the Google client, on the `api.` host                                                               |
| `NEXT_PUBLIC_API_URL` | the API origin — `next.config.ts` derives `images.remotePatterns` from it, so a wrong value silently breaks every uploaded avatar |

```bash
pnpm env:base64 production              # reads server/.env.production.local
pnpm env:base64 production | clip       # Windows, straight to the clipboard
pnpm env:base64 production | pbcopy     # macOS
```

`scripts/env-to-base64.mjs` normalises CRLF before encoding and puts only the base64 on
stdout, so it pipes cleanly. On stderr it lists the key names (never values) and warns
about the mistakes that are otherwise invisible until the deploy fails: a key the deploy
owns, a missing required key, the dev `JWT_SECRET`, the dev Postgres port, or `localhost`
in `DATABASE_URL`.

`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` are **not** part of this secret — they
configure the Postgres container and live in `$APP_DIR/db/.env` on the server
(`deployment/db.env.example`). The API only ever sees `DATABASE_URL`. Keep the two in
sync by hand.

## The workflows

|              |                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`     | PR → master. `pnpm install` then typecheck · typecheck:server · gates · lint · test · build · build:api. Named per step so the failing gate is obvious.                              |
| `deploy.yml` | Push to `master` (or manual **Run workflow**). `changes` decides which side deploys, `verify` runs the non-build gates, `build-web` and `build-api` run in parallel, `deploy` ships. |

`deploy.yml` deploys **API first**, the reverse of a static-SPA pipeline: bookie's pages
call the API while rendering, so the schema and API must be new before the new pages serve.

Per deploy the API side runs `pnpm install --prod --frozen-lockfile` → `prisma generate` →
`prisma migrate deploy` → restart → poll `/health`. The web side extracts, flips the
symlink, restarts and polls `/en` (never `/` — `localePrefix` is `always`, so `/` is a 307).

### Why the API ships as a standalone package

`scripts/build-api-release.mjs` builds `out/api` as a single-package project with its
dependencies pinned to the exact versions the workspace resolved. Two alternatives were
tried and rejected:

- **Shipping a workspace slice.** `pnpm install --filter bookie-server` still installs every
  root dependency (~900MB of next/antd/toolchain) and still runs the root's `prepare: husky`.
- **Shipping a prebuilt `node_modules`.** `pnpm deploy` reassembles the virtual store into a
  layout where Prisma's generated client cannot resolve its own `#main-entry-point`
  self-reference, and the API dies at boot.

Installing on the host also means native dependencies (`@node-rs/argon2`, the Prisma
engines) are fetched for the host's own platform rather than the runner's.

## Ports, and changing one

Bookie claims three, all bound to loopback — nothing is exposed but 80/443 through nginx:

| Port | What     | Declared in                                                                                                                       |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 7004 | Next     | `bookie-web.service` (`Environment=PORT`), `bookie.mnavasardian.com.conf` (`proxy_pass`), `deploy.yml` (`WEB_PORT`, health check) |
| 9004 | Express  | `bookie-api.service` (via the deploy's env file), `api.bookie.mnavasardian.com.conf`, `deploy.yml` (`API_PORT`)                   |
| 5004 | Postgres | `docker-compose.prod.yml` (`ports:`), and `DATABASE_URL` inside `ENV_API_BASE64`                                                  |

On a host shared with other apps, check before the first deploy:

```bash
sudo ss -ltnp | grep -E ':(80|443|7004|9004|5004)\b'   # who is listening
docker ps --format 'table {{.Names}}\t{{.Ports}}'      # what containers publish
```

`preflight.sh` does both and names the holding process where it can.

**A clash is not subtle but it is late:** Postgres fails at `docker compose up -d` with
"port is already allocated", and an app-port clash means nginx proxies to somebody else's
service. Changing a port means editing **every** row above — the duplication is real, so
grep for the old number afterwards.

80 and 443 are shared with whatever else nginx serves; separate `server_name`s are what
keep the sites apart, so no clash there.

## Operations

```bash
# logs
journalctl -u bookie-web -f
journalctl -u bookie-api -f

# status
systemctl status bookie-web bookie-api

# rollback — migrations do NOT roll back; a destructive migration needs a restore
ls -t /home/michael/apps/bookie/web/releases          # pick the previous sha
ln -sfn /home/michael/apps/bookie/web/releases/<sha> /home/michael/apps/bookie/web/current
sudo systemctl restart bookie-web                     # same shape for api

# redeploy without a code change
# GitHub → Actions → "Deploy to Production" → Run workflow
```

**Never run `pnpm db:seed` against production.** It creates the dev accounts from
`docs/DEV_CREDS.md`, all sharing one published password. The seed only runs from
`scripts/postinstall.mjs`, which the deploy never invokes — and the release's generated
`package.json` deliberately carries no `postinstall`.

## Gotchas worth knowing before you debug

- **Changing `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_SITE_URL` requires a rebuild.** They are
  inlined, and `next.config.ts` derives `images.remotePatterns` from the API URL — get it
  wrong and `next/image` silently refuses every uploaded avatar. Next 16 also 400s a
  matching pattern when the hostname resolves to a private IP; `dangerouslyAllowLocalIP`
  is therefore on only while that URL is loopback, and stays off in production.
- **Never put `proxy_cache` on the web host.** `src/proxy.ts` answers unprefixed and guarded
  requests with personalised 307s carrying `Vary: Accept-Language, Cookie` and
  `Cache-Control: no-store`. Caching them pins one visitor's language onto everyone.
- **Never strip `Origin`/`Referer` at nginx.** `requireSameOrigin` rejects state-changing
  requests without them in production.
- **`trust proxy` is 1** (`server/src/app.ts`), matching exactly one hop. Add another proxy
  in front and the rate limiters start bucketing every client together again.
- **One API process only.** `server/src/lib/rateLimit.ts` is in-memory and per-process; a
  second instance doubles every limit. Move it to Redis first.
- **`shared/uploads` is state.** It lives outside the releases on purpose. Back it up.

## Rendering

**Done:** 11 routes under `[lang]` prerender to static HTML, one copy per locale — 176
prerendered routes in the `prerender-manifest`, up from 9. That is `/terms`, `/privacy`,
`/contact`, `/routes-overview` and the seven `/auth/*` steps that do not read
`searchParams`. The enabling change is `i18n/request.ts` reading `lang()` from
`next/root-params`, together with `generateStaticParams` in the root layout; without
that, next-intl resolves the locale through `headers()`, a dynamic API, and the route
stays `ƒ`. Do not reintroduce `setRequestLocale` — it is deprecated.

Static pages are still served by the Node process, not off disk — nginx proxies every HTML
request. They are simply near-free to serve now: no API call, no render.

**Remaining**, in the order I would take them:

| Route group                                                   | Now | Target                                   | Blocker                                               |
| ------------------------------------------------------------- | --- | ---------------------------------------- | ----------------------------------------------------- |
| `/`, `/categories`, `/organizations`                          | `ƒ` | ISR, short TTL                           | none — `export const revalidate`                      |
| `/providers/[id]`, `/categories/[id]`, `/organizations/[id]`  | `ƒ` | PPR: static shell, streamed availability | needs `revalidateTag` from the API on provider update |
| `/auth/sign-in`, `/auth/reset-password`, `/auth/verify-email` | `ƒ` | stays `ƒ`                                | read `searchParams` — dynamic by definition           |
| `/providers` (explore)                                        | `ƒ` | stays `ƒ`                                | reads `searchParams`                                  |
| `/providers/profile*`, `/consumers/profile*`                  | `ƒ` | stays `ƒ`                                | per-user, cookie-gated                                |

The lever for the detail pages is `cacheComponents: true`, a stable top-level config in
Next 16 that makes Partial Prerendering the App Router default — a prerendered shell served
immediately with dynamic holes streaming in. That fits `/providers/[providerId]`, where
identity, hours and location are static and only the slot grid is live. It replaces
`force-dynamic` and `revalidate` with `use cache` + `cacheTag` at the component level.

The deploy layout does not change for any of this: ISR and PPR write to the release's own
`.next/cache`, which is exactly what a single `next start` instance on persistent disk
supports.
