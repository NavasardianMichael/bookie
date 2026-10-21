# CLAUDE.md slimming — 2026-10-21

The eleven `CLAUDE.md` files had grown to ~204 KB. The root file loads on every request and
each nested one whenever a file in its directory is touched, so feature-specific design
stories rode along with every unrelated edit. The pass split **rules** (stay in the
auto-loaded file) from **reasons** (moved to a file read on demand).

## What moved where

| From | To |
|---|---|
| `src/app/CLAUDE.md` — Explore's decisions and prototype deviations | `docs/routes/explore.md` |
| `src/app/CLAUDE.md` — provider page, booking panels, time-zone controls, vanity link | `docs/routes/provider-page.md` |
| `src/app/CLAUDE.md` — `/bookings` and favourites decisions | `docs/routes/bookings-and-favorites.md` |
| `src/app/CLAUDE.md` — settings tabs, workspace switch | `docs/routes/account-settings.md` |
| `src/app/CLAUDE.md` — sign-on funnel, registration deviations | `docs/routes/auth.md` |
| `src/i18n/CLAUDE.md` — namespaces, copy rules, inflected languages, adding a locale | `translations` skill (`.claude/skills/translations/`) — it now loads when editing `src/messages/`, which never loaded the i18n file |
| Root `CLAUDE.md` — Cursor adapter table | `.cursor/rules/claude-source-of-truth.mdc` (already held it) |

`server/`, `src/components/`, `src/styles/`, `src/helpers/` and `tests/` were condensed in
place: every rule kept with a one-clause reason, incident narratives dropped (git history
has them). The invariant and trap numbers in `src/styles/CLAUDE.md` are unchanged, because
`scripts/gates.mjs` cites them.

## Stale facts fixed along the way

- `src/api/CLAUDE.md` still listed the deleted `src/constants/api.ts`.
- `deployment/CLAUDE.md` called `bookie_session` host-only; it carries `Domain` = the web host.
- "Seven remaining `size='large'` call sites" — there are six, in the five files listed.
- `src/app/CLAUDE.md` marked routes `●` while noting every route builds `ƒ`; it now states the
  current state and the intended one separately.
- `src/i18n/CLAUDE.md` said auth screens hardcode copy; `Auth.*` covers every screen, and the
  `Billing` namespace was missing from the list.
- `server/CLAUDE.md`'s emailed-link table was split in two by a paragraph.

The rule going forward is in root `CLAUDE.md` → *Keeping the docs current*: a feature's
*why* goes in its `docs/routes/*.md`; the nested `CLAUDE.md` keeps rules and pointers.
