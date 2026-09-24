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
- **A request body is flat, and multipart only when it really carries a `File`.**
  Setting `Content-Type: multipart/form-data` makes axios serialise the body with
  `toFormData`, which flattens a nested object to `parent[child]` keys — and multer does no
  bracket parsing, so the API reads every field as `undefined`. Check for the `File` first
  (`putProviderProfileAPI` and the service calls both do), and send plain JSON otherwise.
  `toFormData` also **drops `undefined` and `null`** while keeping `''`, so `''` is the only
  marker that means "clear this field" on both paths.
- Errors surface as axios rejections. Do not inspect `data.error` inline — that is what
  `src/helpers/error.ts` is for: `classifyError` for what to show, `processError(e).code`
  for branching on a code. How a failure is *displayed* is `src/components/CLAUDE.md`
  → *Errors*.

## What `axiosInstance.ts` does to every request

- **A timeout.** `API_REQUEST_TIMEOUT_MS` (30 s) on everything; a multipart body is bumped
  to `API_UPLOAD_TIMEOUT_MS` by the request interceptor, so the upload calls need not ask.
  axios's default is no limit, which let a hung API hold a skeleton or a submit spinner
  forever. A timeout classifies as `timeout` and offers Retry.
- **A failed request names itself.** The response interceptor rewrites the error's
  `message` to `[status] METHOD path — <envelope message>`. Only the development details
  ever show it on the client; its real audience is a Server Component, whose error reaches
  `error.tsx` as a message alone (and is stripped to a digest in production).
- **A 401 is a dead session — except where it is not.** It full-page redirects to
  account-type selection, *unless* the request is the guest probe (`/identity/me`), a
  re-auth or token failure the page explains itself (change-password, change-email send and
  confirm, delete-account), logout, a public booking write, or already under `/auth`. Add
  to that list whenever an endpoint's 401 means "wrong password" or "bad link" rather than
  "signed out" — the redirect replaces the one message that said what went wrong.

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

- **`src/constants/api.ts`** is a byte-identical duplicate of `paramsToQueryString` from
  `src/helpers/api.ts`. Delete it rather than extend — the `src/helpers/api.ts` copy is the
  live one (`api/organizations/main.ts` builds the `?q=` search with it).
