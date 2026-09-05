# Store layer — invariants

Zustand, one directory per domain slice:

```
src/store/<domain>/<slice>/store.ts   ( slice = list | single | profile )
src/store/<domain>/<slice>/types.ts
```

`auth` is flat — `src/store/auth/store.ts`, no slice directory.

## The scaffold — reproduce exactly

```ts
export const useProvidersListStoreBase = create<ProvidersListState & ProvidersListActions>()(
  immer(
    combine(
      initialState,
      (set): ProvidersListActions => ({ … })
    )
  )
)

export const useProvidersListStore = appendSelectors(useProvidersListStoreBase)
```

Four things that are not negotiable:

1. **`create<S & A>()( … )`** — the curried form, with the explicit `State & Actions`
   union even though `combine` could infer it.
2. **`immer( combine( … ) )`**, always that nesting order.
3. The action factory is annotated `(set): <Domain><Slice>Actions => ({…})`. Only `set`
   is destructured; no store in this repo takes `get` or `api`.
4. Two exports: the raw `use…StoreBase` hook and the `appendSelectors`-wrapped one.

**The middleware triple is `create` + `immer` + `combine`. `devtools` is not used
anywhere** — if a doc says otherwise, the doc is wrong.

## Two mutation dialects, both valid under immer

```ts
setProvidersListState: (payload) => { set((state) => ({ ...state, ...payload })) },  // replace
setProvidersList:      (payload) => { set((state) => { state.list = { ...state.list, ...payload } }) },  // draft
```

Generic `setXState` setters replace; targeted writes mutate the draft (`delete
state.services.byId[id]`, `.push`). Do not mix within one action.

## `appendSelectors`

Generates **one zero-arg hook per top-level key of `getState()`** — state fields *and*
actions alike, since `combine` merges them before it runs:

```ts
useProvidersListStore.use.list()        // subscribed slice
useProvidersListStore.use.getProvidersList()   // the action itself, not a call of it
```

Keys are snapshotted **at module init**, so a state key absent from `initialState` gets
no selector. `WithSelectors` resolves to `never` if the input doesn't structurally
match, which silently kills autocomplete rather than erroring.

## Entity types

One full entity per domain in the `single`/`profile` `types.ts`, everything else derived
with `Pick`:

```ts
export type ProviderProfile = { id; basic; details; services; personal }
export type BasicProvider   = Pick<ProviderProfile, 'id' | 'basic'>
export type SingleProvider  = Pick<ProviderProfile, 'id' | 'basic' | 'details' | 'services'>
export type ProvidersListState = { list: Normalized<BasicProvider> } & StateCommonProps
```

The `basic` / `details` / `services` / `personal` grouping is the house layout: `basic`
is card-renderable identity, `details` is contact + schedule + gallery, `personal` is
private. `Category` is flat — the exception.

`StateCommonProps` (`isPending`, `error`) comes from `src/interfaces/store.ts`;
`Normalized<T>` from `src/interfaces/commons.ts`.

## Server Components do not use stores

`src/app/**/page.tsx` calls the API layer directly with
`export const dynamic = 'force-dynamic'`. Stores exist for client interactivity only.
Do not hydrate a store with props a Server Component already fetched.

## Known non-canonical code — do not copy

- **`use…StoreBase` vs `use…Base`** — list/profile stores use the first, single stores
  the second. Pick `use…StoreBase` for new code.
- **`src/store/auth/store.ts`** is the one store that wraps every async action in
  `try/finally`, because `errorMiddleware` does not catch rejections and the whole sign-on
  funnel is gated on `isPending` — leaving it `true` locked the user out of retrying. Copy
  that shape, not the other stores'.
- **`src/store/categories/list/store.ts`** ships **fake seed data** in `initialState`
  (`allIds: ['c-1']`). A leftover, not a pattern.
- **`errorMiddleware`** (`src/helpers/store.ts`) is auth-only and only reassigns
  `api.setState` — it does **not** catch rejections thrown inside async actions.
- Action return types drift between `() => void` and `() => Promise<void>` for
  identically-`async` implementations. Prefer `Promise<void>`.
