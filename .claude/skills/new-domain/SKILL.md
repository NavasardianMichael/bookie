---
name: new-domain
description: Scaffold a new API module and/or Zustand store slice in this repo — the four-file src/api/<domain>/ quadruple (endpoints, main, processors, types) and the src/store/<domain>/<slice>/ pair. Use whenever adding a new backend resource, a new entity, a new endpoint to an existing domain, or a new store slice. Triggers on "add an API for X", "new endpoint", "new store", "wire up X from the backend".
---

# Scaffolding a domain

Copy the shape exactly. Full file templates: [references/templates.md](references/templates.md).
Layer invariants: `src/api/CLAUDE.md` and `src/store/CLAUDE.md`.

## Decide the scope first

| Adding | Touch |
|---|---|
| One endpoint to an existing domain | `endpoints.ts` + `types.ts` + `processors.ts` + `main.ts` of that domain |
| A whole new resource | All four API files + at least one store slice |
| Client-only state (no backend) | Store slice only — see `src/store/consumers/list/` |
| A page that only reads on the server | API files only. **Do not create a store** the page won't use |

That last row matters: Server Components call the API layer directly with
`export const dynamic = 'force-dynamic'`. A store that merely caches a page's props is
the anti-pattern this repo already has one instance of.

## Order of work

1. **`src/store/<domain>/<slice>/types.ts` first.** The entity type lives here, and the
   API layer imports *from* it. Getting this backwards creates an import cycle.
2. `src/api/<domain>/endpoints.ts` — one key per operation, `as const`.
3. `src/api/<domain>/types.ts` — one `Endpoint<>` declaration per operation.
4. `src/api/<domain>/processors.ts` — unwrap `.value`, normalize if it's a list.
5. `src/api/<domain>/main.ts` — the axios calls.
6. `src/store/<domain>/<slice>/store.ts` — the `create + immer + combine` scaffold.
7. `pnpm typecheck && pnpm lint-fix`.

## The five things people get wrong

1. **The dependency arrow is `api/types.ts → store/types.ts`, never the reverse.**
   Entity types live in the store; the API imports them. The only reverse edge is
   `store/types.ts` importing `api/types.ts` for an action's `['payload']` — type-only,
   so there is no runtime cycle.

2. **`Endpoint<>` is a type bag, never instantiated.** Declare it, then index into it:
   `GetProvidersListAPI['api']` annotates the function, `['processor']` annotates the
   processor. Omitted keys resolve to `unknown` — that is how void mutations declare
   only `payload`.

3. **Single-entity GETs must be wrapped in `React.cache`.** `generateMetadata` and the
   page body both fetch the same entity; without it every detail page makes two HTTP
   calls. The private fetcher takes a **primitive** — `cache` keys on argument identity,
   so an object argument would never hit.

4. **`appendSelectors` snapshots keys at module init.** A state field missing from
   `initialState` gets no `use.*` selector, silently.

5. **`create<State & Actions>()( … )`** — the curried form with the explicit union, and
   `immer( combine( … ) )` in that order. Only `set` is destructured.

## Naming

| Thing | Rule | Example |
|---|---|---|
| API function | `<verb><Thing>API` | `getProvidersListAPI` |
| Its type | `<Verb><Thing>API` | `GetProvidersListAPI` |
| Processor | `process<Thing>Response` | `processProvidersListResponse` |
| Wire alias | `<Thing>Response` | `BasicCategoryResponse` |
| Request payload | `<Verb><Thing>RequestPayload` | `PutProviderProfileRequestPayload` |
| Cached fetcher (private) | `fetch<Thing>` | `fetchSingleProvider` |
| State / Actions | `<Domain><Slice>State` / `Actions` | `ProvidersListState` |
| Raw hook | `use<X>StoreBase` | `useProvidersListStoreBase` |
| Public hook | `use<X>Store` | `useProvidersListStore` |

Entity types: declare **one full entity** in the `single`/`profile` slice, derive the
rest with `Pick`. The house layout is `basic` (card-renderable identity) / `details`
(contact, schedule, gallery) / `services` / `personal` (private).

## Do not copy these

Real inconsistencies that exist in the tree — read the two `CLAUDE.md` files for the
full list, but the load-bearing ones:

- `src/api/appointments/` bypasses `Endpoint<>` entirely. Not a model.
- `src/store/categories/list/store.ts` ships fake seed data in `initialState`.
- `src/store/auth/store.ts` leaves `isPending: true` forever if the API rejects.
- `use…Base` (single stores) vs `use…StoreBase` (list/profile). Use the latter.

## Before you're done

```bash
pnpm typecheck && pnpm lint-fix && pnpm test
```

If the domain is user-facing, add unit tests for its processors under
`tests/integration/api/` — they are pure `APIResponse<T> → processed` functions and need
no network.
