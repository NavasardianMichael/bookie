# API layer — invariants

Every domain is a four-file module. Do not add a fifth file or collapse to fewer.

```
src/api/<domain>/
  endpoints.ts    URL strings only, `as const`
  main.ts         axios calls, typed via Endpoint<…>['api']
  processors.ts   APIResponse<T> -> processed shape
  types.ts        Endpoint<> declarations + request payload types
```

To scaffold a new one, use the `new-domain` skill — it has the full templates.

## The type contract

`src/interfaces/api.ts` defines a **type bag** that is never instantiated:

```ts
export type Endpoint<T extends EndpointPaths> = {
  payload: T['payload']
  response: T['response']
  processed: T['processed']
  api: (args: T['payload']) => Promise<T['processed']>
  processor: (args: APIResponse<T['response']>) => T['processed']
}
```

Declare one per operation, then index into it: `GetProvidersListAPI['api']`,
`['processor']`, `['payload']`. Omitted keys resolve to `unknown`, which is how
void-returning mutations declare only `payload`.

The server envelope is **always** `{ value, error }`. `axiosInstance.get<APIResponse<X>>()`
gives you the envelope; the processor unwraps `.value`.

## Rules

- **Endpoints live only in `endpoints.ts`.** One key per operation even when the path
  string repeats. Path params and sub-resources are interpolated at the call site in
  `main.ts`, never stored in `ENDPOINTS`.
- **The dependency arrow is `api/types.ts → store/types.ts`, never the reverse.** Domain
  entity types live in `src/store/<domain>/<slice>/types.ts`. The API layer imports them.
- **Never import store *state* here.** Types only. No `useXStore` in this directory.
- Errors surface as axios rejections. Do not inspect `data.error` inline — that is what
  `src/helpers/error.ts#processError` is for.

## The `React.cache` idiom for single-entity GETs

`generateMetadata` and the page body both fetch the same entity. Wrap once:

```ts
/** Dedupes generateMetadata + page fetches within a single request. */
const fetchCategory = cache(async (id: string) => { … })

export const getCategoryAPI: GetCategoryAPI['api'] = async (args) => fetchCategory(args.id)
```

The private fetcher takes a **primitive**, deliberately — `cache` keys on argument
identity, so an object argument would never hit.

## Known non-canonical code — do not copy

- **`src/api/appointments/`** bypasses `Endpoint<>` entirely: hand-written signatures,
  inline `if (data.error) throw`, no `processors.ts`. It is the only place that inspects
  the envelope's error at the call site. Treat it as an outlier to be fixed, not a model.
- **`src/constants/api.ts`** is a byte-identical duplicate of `paramsToQueryString` from
  `src/helpers/api.ts`. Delete it rather than extend — the `src/helpers/api.ts` copy is the
  live one (`api/organizations/main.ts` builds the `?q=` search with it).
