# Deployment — invariants

Host-side configuration templates. Procedure, server setup and the secrets table live in
[docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md); this file holds the rules that must not break.

```
deployment/
  bookie.mnavasardian.com.conf      nginx, web host      -> 127.0.0.1:7004
  api.bookie.mnavasardian.com.conf  nginx, API host      -> 127.0.0.1:9004
  bookie-web.service       systemd, Next standalone
  bookie-api.service       systemd, Express
  docker-compose.prod.yml  production Postgres, loopback-bound
  db.env.example           POSTGRES_* for that container, copied to $APP_DIR/db/.env
  preflight.sh             read-only readiness check, run on the host before deploying
```

**These are templates, not live config.** Nothing deploys them — they are copied to the
server by hand. Paths already assume `APP_DIR=/home/michael/apps/bookie`; only the
domains still need replacing. When you change one here, say so in the PR: someone has to
re-copy it.

## Rules

- **The release symlink is the deploy mechanism.** Both units set `WorkingDirectory` to
  `…/current`; systemd resolves the symlink at start, so `systemctl restart` is what
  promotes a release. Never make a unit point at a concrete `releases/<sha>` path.
- **Never add `proxy_cache` to the web host.** `src/proxy.ts` answers unprefixed and guarded
  requests with personalised 307s carrying `Vary: Accept-Language, Cookie` and
  `Cache-Control: no-store`. Caching them serves one visitor's language to everyone.
- **Never clear or rewrite `Origin`/`Referer` on the API host.** `requireSameOrigin`
  (`server/src/middleware/csrf.ts`) rejects state-changing requests without them in
  production.
- **`proxy_buffering off` on the web host is load-bearing**, not a tuning knob — Next
  streams RSC payloads, and buffering defeats every Suspense boundary.
- **`/_next/static/` and `/uploads/` are served from disk; `/_next/image` is not.** It is
  the optimizer and must reach Node.
- **Two origins, deliberately.** The `bookie_session` cookie is host-only on the API origin.
  Collapsing the two hosts into one breaks `CORS_ORIGIN`, `GOOGLE_REDIRECT_URI` and
  `next.config.ts`'s `new URL(NEXT_PUBLIC_API_URL)`, which throws on a relative value.
- **`shared/uploads` and `shared/.env.api` live outside the releases** and must stay there —
  release rotation deletes everything under `releases/`.
- **systemd `EnvironmentFile` is not dotenv.** No `export`, no multi-line values, no command
  substitution.
- **One API process.** `server/src/lib/rateLimit.ts` is in-memory and per-process, and
  `app.set('trust proxy', 1)` assumes exactly one hop.
