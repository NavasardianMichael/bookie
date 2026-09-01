# Bookie

Appointment booking. Next.js App Router frontend + an Express/Prisma API in `server/`,
one pnpm workspace.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Ant Design 6 · Tailwind 4 ·
Zustand (immer) · pnpm · Express 5 + Prisma + PostgreSQL

## Commands

```bash
pnpm dev            # web :4141 + api :4142 together — the usual dev entry point
pnpm watch          # alias for `pnpm dev`
pnpm dev:web        # web only, :4141 (turbopack)
pnpm server:dev     # api only, :4142

pnpm typecheck      # verification loop, in the order that fails fastest
pnpm lint           # `pnpm lint-fix` for the simple-import-sort churn
pnpm test           # unit + integration (vitest)
pnpm build

pnpm test:e2e       # opt-in — needs the DB and both servers up
pnpm db:up          # Postgres via Docker Desktop
pnpm db:setup       # migrate + seed
```

**There is no CI.** `typecheck → lint → test → build` is the only guard; run it before
declaring anything done. Dev OTP is `123456`; seeded accounts are in `docs/DEV_CREDS.md`.

## Path alias

`@*` maps to `./src/*` — **not** `@/`. So `@helpers/booking`, `@components/ui/layout`,
`@store/providers/list/types`. `@test/*` maps to `./tests/*`.

Import order is enforced by `simple-import-sort` with an explicit group list in
`eslint.config.mjs`; `pnpm lint-fix` sorts it for you.

## Where things live

| Looking for | Go to |
|---|---|
| HTTP calls, endpoint URLs, response processors | `src/api/<domain>/` — 4 files, see `src/api/CLAUDE.md` |
| Client state, entity types | `src/store/<domain>/<slice>/` — see `src/store/CLAUDE.md` |
| Routes and pages | `src/app/` — see `src/app/CLAUDE.md` for the route map |
| Reusable UI | `src/components/ui/` — see `src/components/CLAUDE.md` |
| Colours, spacing, breakpoints, fonts | `src/styles/tokens.ts` — see `src/styles/CLAUDE.md` |
| **Any utility — check before writing one** | `src/helpers/` — see `src/helpers/CLAUDE.md`, it indexes every export |
| Booking / schedule / slot logic | `src/helpers/booking.ts`, `src/helpers/schedule.ts` |
| JSON-LD structured data | `src/linkedDataSchema/` + `src/helpers/jsonLd.ts` |
| Route paths, form rules, week days, plans | `src/constants/` — paths only in `routes.ts` |
| API, DB schema, routes | `server/` — see `server/CLAUDE.md` and `docs/DATABASE_STRUCTURE.md` |
| Tests | `tests/` — see `tests/CLAUDE.md` |
| What's still outstanding | `docs/BACKLOG.md` |

**Eight directories carry their own `CLAUDE.md`** — `src/api`, `src/app`,
`src/components`, `src/helpers`, `src/store`, `src/styles`, `server`, `tests`. Each holds
that layer's invariants and its known non-canonical code. They load automatically when
you open a file in that directory, so read the relevant one before editing rather than
inferring the pattern from neighbouring files.

Because they load on *touch*, they cannot route you to a directory you have not opened
yet — that is this table's job. If you are about to grep the codebase to learn a
convention, check the table first.

## Skills

- **`new-domain`** — scaffold an API module + store slice. Use it instead of hand-copying
  from `src/api/providers/`.
- **`design-system`** — building pages and UI: component inventory, token flow, grep gates.
- **`forms`** — the Ant Design `Form` pattern. Formik is being removed; do not add more.

## Cursor

Cursor loads `.claude/skills/` and `.claude/agents/` natively — do not duplicate those
bodies in `.cursor/`. Thin Cursor adapters live in `.cursor/` and point here:

| Cursor | Points at |
|---|---|
| `.cursor/rules/*.mdc` | Nested `CLAUDE.md` files (glob-scoped) + `.cursor/rules/claude-source-of-truth.mdc` index |
| `.cursor/skills/` | `.claude/commands/` — `/route`, `/commit-and-push`, `/best-avoid-practices` |
| `.cursor/agents/architect.md` | `.claude/agents/architect.md` (adds `readonly` + Opus model) |
| `.cursor/hooks.json` | `.claude/hooks/deny-env-access.mjs` for shell; native read guard for `.env*` |

## Working rules

- **Inspect before writing.** Read the existing files in the same domain and follow their
  structure and naming exactly. Do not invent a new pattern where one exists.
- **Reuse before creating.** `src/helpers/CLAUDE.md` indexes every utility; check it.
- No `any` without an explicit justification in a comment.
- Explicit types on parameters and return values. Strongly typed `Props` on every component.
- **Prefer a named export declared inline** — `export const AppButton = …` over
  `export default AppButton` or a trailing `export { AppButton }`. A default export lets
  each import site invent its own name for the symbol, so a rename never propagates and
  the codebase stops being greppable; a trailing `export {}` splits the declaration from
  the fact that it is public. Re-exporting from another module
  (`export { AppButton } from './AppButton'`) is how barrels work and is fine.
  **A preference, not a requirement:** when a framework or tool resolves the module *by*
  its default binding, the default export is a contract — leave it. That covers Next.js
  route modules (see `src/app/CLAUDE.md`), config files, and ambient `.d.ts` declarations.
  `no-restricted-syntax` in `eslint.config.mjs` flags the free cases as a **warning**.
- Absolute imports from `src/`. Import order is enforced — `pnpm lint-fix` sorts it.
- Keep files small and single-purpose; split rather than append.
- Comment only where the purpose is not obvious from the code and its naming.
- **Every async operation handles its errors.** Reuse `src/helpers/error.ts#processError`.
  Never swallow one silently.
- Commits use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) —
  the `/commit-and-push` command does this for you.

### Forbidden

- Skipping types
- Hardcoding an endpoint or URL outside `src/api/<domain>/endpoints.ts`
- Mixing UI, API, and store concerns
- Introducing a new pattern without precedent
- Duplicating existing functionality
- Reading or printing `.env*` files (except `*.env.example`)
- Adding new Formik usage

## Keeping the docs current

Documentation here is load-bearing: agents and humans both read it instead of re-deriving
the codebase. **A stale doc is worse than no doc** — it produces confident wrong work.
This repo has been bitten by exactly that (a handoff file claimed a phase was unstarted
months after it shipped).

So when a change lands, update the docs **in the same change**, not later:

| What you did | Where it gets recorded |
|---|---|
| Added a subsystem, layer, or directory | A new `CLAUDE.md` in that directory + a row in *Where things live* above |
| Added a tool, script, or dependency | *Commands* above, plus the nested `CLAUDE.md` that owns it |
| Established a convention or best practice | The nested `CLAUDE.md` for that layer — or a skill in `.claude/skills/` if it is a procedure rather than a rule |
| Completed a large refactor | Summarise in `docs/history/`, update every affected nested `CLAUDE.md`, and delete what it resolved from `docs/BACKLOG.md` |
| Found a defect you are not fixing now | `docs/BACKLOG.md`, plus a test asserting current behaviour named `KNOWN BUG:` |
| Fixed something listed in the backlog | Remove the entry and flip its test to assert correct behaviour |
| Changed the schema or API routes | `docs/DATABASE_STRUCTURE.md` |

Two standing rules:

- **When a doc and the tree disagree, the tree wins.** Fix the doc as part of the work,
  and say that you did.
- **Delete superseded docs; do not leave pointer stubs.** If content moved, update the
  links that referenced it.

To add a single convention or anti-pattern, use **`/best-avoid-practices <the practice>`**
— it routes the rule to the right file, checks it is not already covered or already
enforced by ESLint, measures the codebase against it, and adds a grep gate where the rule
is mechanically checkable.

## Architecture facts that are easy to get wrong

- **Server Components are the default.** `"use client"` only for hooks, store access,
  browser APIs, or interactivity. Pages fetch through the API layer with
  `export const dynamic = 'force-dynamic'`; **stores are for client interactivity only.**
- **antd v6 marks ~292 modules `"use client"`.** That is why `src/components/ui/bare/`
  exists and why `ui/index.ts` re-exports only antd-free primitives.
- **A hex or magic px belongs in `src/styles/tokens.ts` and nowhere else.**
- **Ant Design `Form` owns form state and validation.** Formik is legacy.
- Time is wall-clock `'HH:mm'` strings for schedules, local-anchored `Date` for slots.
  `dayjs` is the only time library — `temporal-polyfill` is a FullCalendar peer dep with
  zero usages in `src/`.

## Env files (hard rule)

Never read, open, search, print, or otherwise surface the contents of any file whose
name starts with `.env` — at any path, at any depth. This applies to every access route:
Read, Grep, Glob, shell commands (`cat`, `type`, `Get-Content`, `grep`, `rg`, `sed`,
`head`, `tail`, `dotenv` dumps), and subagents.

**The only exception is `*.env.example`** — read those freely to learn which keys exist.
They hold placeholders, never real values.

If a real env file is missing, copy the matching `.env.example` and leave placeholders
for the user to fill in. Never inspect a secret env file to discover a value, and never
ask for secret values to be pasted into the conversation — name the missing key instead.

Enforced at the harness level two ways: `permissions.deny` in `.claude/settings.json`
covers the `Read` tool, and `.claude/hooks/deny-env-access.mjs` blocks the shell route
for both Bash and PowerShell.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
