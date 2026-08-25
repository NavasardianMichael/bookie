# Tests — conventions

```
tests/
  unit/          pure functions — no network, no DOM, no React
    helpers/
  integration/   several units together, dependencies mocked
    api/         processors: pure APIResponse<T> -> processed
    store/       zustand actions driven headlessly, API module mocked
  e2e/           Playwright — opt-in, needs the full stack
  setup/         vitest.setup.ts (guards) + fixtures.ts (builders)
```

Layout is `[test type]/[layer]`, mirroring `src/`. Test files live here, never beside
their target. Naming is `<subject>.spec.ts`.

```bash
pnpm test         # unit + integration — fast, no external dependencies
pnpm test:watch
pnpm test:e2e     # needs: pnpm db:up && pnpm db:setup && pnpm watch
```

`pnpm test` is part of the verification loop and must stay dependency-free so it runs
anywhere. E2E is deliberately excluded from it.

## Two constraints that will bite you

1. **The timezone is pinned to UTC** (`test.env.TZ` in `vitest.config.mts`).
   `BookingSlot.start` is built as `dayjs(date).startOf('day').add(n, 'minute')` — a real
   `Date` in the *runtime's* zone. Without the pin, slot tests pass in one timezone and
   fail in another for reasons that look like logic bugs. `tests/setup/vitest.setup.ts`
   throws if the pin didn't take effect, so a silent regression is impossible.

2. **`src/helpers/images.ts` captures `API_ORIGIN` at module top level.** It cannot be
   changed after import. To test a different origin, set `NEXT_PUBLIC_API_URL` and
   `vi.resetModules()` *before* importing.

## Conventions

- **Import `describe` / `it` / `expect` from `vitest` explicitly.** Globals are off.
- Use `@test/setup/fixtures` builders (`day`, `makeWeekSchedule`, `MONDAY`, `LONG_AGO`)
  rather than hand-rolling schedule objects. Pass `now: LONG_AGO` to any booking call
  whose result would otherwise depend on the wall clock.
- **Mock the API module, never axios.** `vi.mock('@api/providers/main', …)` above a
  `await import(...)` of the store — the store imports the API eagerly, so a plain
  top-level import would bind the real one first.
- Reset store state in `beforeEach` with `useXStoreBase.setState(EMPTY)`. Zustand merges
  shallowly, so the actions survive.
- Environment is `node`. Nothing here touches the DOM. When component tests arrive, add
  `jsdom` + `@testing-library/react` and scope it per file with
  `// @vitest-environment jsdom` rather than switching the whole suite.

## Tests named `KNOWN BUG:`

These assert **current, wrong** behaviour so a fix is a deliberate, visible change rather
than a surprise failure. Each names its entry in `docs/BACKLOG.md`. When you fix the
underlying defect, rewrite the test to assert the correct behaviour and remove the
backlog entry — do not delete the test.

Currently: `splitScheduleIntoParts` mutating its caller's breaks, `normalizedToFlat`
yielding `undefined`, duplicate ids surviving a normalize round-trip,
`generateEntityUrl('home', …)` doubling the slash, and `processError(null)` throwing.

## What is worth testing here

Pure logic where being wrong is expensive and invisible: `booking.ts`, `schedule.ts`,
`duration.ts`, `routes.ts`, `images.ts`, `url.ts`, `commons.ts`, `error.ts`, `jsonLd.ts`,
the `linkedDataSchema/` builders, and every `api/*/processors.ts`.

Not worth testing: `cn.ts` (tests `clsx` + `tailwind-merge`, not us), thin antd wrappers,
`localStorage.ts` (constants only, no logic).
