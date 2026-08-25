# File templates

Substitute `<Domain>` / `<domain>` / `<Entity>`. Prettier config: no semicolons, single
quotes, `jsxSingleQuote`, `printWidth: 120`, `trailingComma: es5`.

---

## `src/store/<domain>/<slice>/types.ts` — write this first

```ts
import { GetSingleWidgetAPI, PutWidgetAPI } from '@api/widgets/types'
import { Normalized } from '@interfaces/commons'
import { StateCommonProps } from '@interfaces/store'

export type Widget = {
  id: string
  basic: {
    name: string
    image?: string
  }
  details: {
    description?: string
  }
}

export type BasicWidget = Pick<Widget, 'id' | 'basic'>

export type WidgetsListState = StateCommonProps & {
  list: Normalized<BasicWidget>
}

export type WidgetsListActions = {
  setWidgetsListState: (payload: Partial<WidgetsListState>) => void
  setWidgetsList: (payload: Partial<WidgetsListState['list']>) => void
  getWidgetsList: () => Promise<void>
}
```

---

## `src/api/<domain>/endpoints.ts`

```ts
export const ENDPOINTS = {
  getWidgetsList: '/widgets',
  getSingleWidget: '/widgets',
  putWidget: '/widgets',
} as const
```

One key per operation even when the path string repeats. Path params and sub-resources
are interpolated at the call site in `main.ts`, never stored here.

---

## `src/api/<domain>/types.ts`

```ts
import { BasicWidget, Widget } from '@store/widgets/single/types'
import { WidgetsListState } from '@store/widgets/list/types'
import { Endpoint } from '@interfaces/api'

/** Seam so the wire shape can diverge from the store shape later. */
export type BasicWidgetResponse = BasicWidget
export type WidgetResponse = Widget

export type GetWidgetsListAPI = Endpoint<{
  payload: void
  response: BasicWidgetResponse[]
  processed: WidgetsListState['list']
}>

export type GetSingleWidgetAPI = Endpoint<{
  payload: Pick<Widget, 'id'>
  response: WidgetResponse
  processed: Widget
}>

export type PutWidgetRequestPayload = Partial<{
  name: string
  description: string
  image: Widget['basic']['image'] | File
}>

/** Mutation returning nothing: declare only `payload`. The rest resolve to `unknown`. */
export type PutWidgetAPI = Endpoint<{ payload: PutWidgetRequestPayload }>
```

---

## `src/api/<domain>/processors.ts`

```ts
import { BasicWidget } from '@store/widgets/list/types'
import { GetSingleWidgetAPI, GetWidgetsListAPI } from './types'

export const processWidgetsListResponse: GetWidgetsListAPI['processor'] = (response) => {
  return response.value.reduce(
    (acc, widget) => {
      const item = widget as BasicWidget
      acc.byId[item.id] = item
      acc.allIds.push(item.id)
      return acc
    },
    { allIds: [], byId: {} } as GetWidgetsListAPI['processed']
  )
}

export const processSingleWidgetResponse: GetSingleWidgetAPI['processor'] = (widget) => widget.value
```

Private helpers that do real mapping use a `function` declaration; the exported typed
processors are always `export const` arrows.

---

## `src/api/<domain>/main.ts`

```ts
import { cache } from 'react'
import axiosInstance from '@api/axiosInstance'
import { APIResponse } from '@interfaces/api'
import { ENDPOINTS } from './endpoints'
import { processSingleWidgetResponse, processWidgetsListResponse } from './processors'
import { GetSingleWidgetAPI, GetWidgetsListAPI, PutWidgetAPI } from './types'

export const getWidgetsListAPI: GetWidgetsListAPI['api'] = async () => {
  const { data } = await axiosInstance.get<APIResponse<GetWidgetsListAPI['response']>>(ENDPOINTS.getWidgetsList)
  const processedResponse = processWidgetsListResponse(data)
  return processedResponse
}

/** Dedupes generateMetadata + page fetches within a single request. */
const fetchSingleWidget = cache(async (id: string) => {
  const { data } = await axiosInstance.get<APIResponse<GetSingleWidgetAPI['response']>>(
    `${ENDPOINTS.getSingleWidget}/${id}`
  )
  return processSingleWidgetResponse(data)
})

export const getSingleWidgetAPI: GetSingleWidgetAPI['api'] = async (args) => fetchSingleWidget(args.id)

/** Void-returning mutation: await without destructuring, return nothing. */
export const putWidgetAPI: PutWidgetAPI['api'] = async (params) => {
  await axiosInstance.put<APIResponse<PutWidgetAPI['response']>>(ENDPOINTS.putWidget, params, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
```

`multipart/form-data` only when the payload can carry a `File`. Plain JSON otherwise —
`axiosInstance` already sets `Content-Type: application/json`.

### Upsert (POST when no id, PUT when there is one)

The method choice belongs in `main.ts`, not the store:

```ts
export const putWidgetItemAPI: PutWidgetItemAPI['api'] = async (params) => {
  const { widgetId, item } = params
  const itemId = item.id
  const url = itemId
    ? `${ENDPOINTS.putWidgetItem}/${widgetId}/items/${itemId}`
    : `${ENDPOINTS.putWidgetItem}/${widgetId}/items`
  const { data } = await axiosInstance.request<APIResponse<PutWidgetItemAPI['response']>>({
    url,
    method: itemId ? 'put' : 'post',
    data: { item },
  })
  return processWidgetItemResponse(data)
}
```

---

## `src/store/<domain>/<slice>/store.ts`

```ts
import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getWidgetsListAPI } from '@api/widgets/main'
import { appendSelectors } from '@store/appendSelectors'
import { WidgetsListActions, WidgetsListState } from './types'

const initialState: WidgetsListState = {
  list: { allIds: [], byId: {} },
  isPending: false,
  error: null,
}

export const useWidgetsListStoreBase = create<WidgetsListState & WidgetsListActions>()(
  immer(
    combine(
      initialState,
      (set): WidgetsListActions => ({
        // Generic setter: replace.
        setWidgetsListState: (payload) => {
          set((state) => {
            return { ...state, ...payload }
          })
        },
        // Targeted write: mutate the immer draft.
        setWidgetsList: (payload) => {
          set((state) => {
            state.list = { ...state.list, ...payload }
          })
        },
        getWidgetsList: async () => {
          const normalizedWidgets = await getWidgetsListAPI()
          set((state) => {
            state.list = normalizedWidgets
          })
        },
      })
    )
  )
)

export const useWidgetsListStore = appendSelectors(useWidgetsListStoreBase)
```

Export `initialState` only when another module must derive from it. When you do, name it
`SCREAMING_SNAKE` (`WIDGET_INITIAL_STATE`) and `structuredClone` it at the consumer, so
immer drafts never share a reference.

---

## Consuming it

**Server Component** — the default. No store:

```tsx
export const dynamic = 'force-dynamic'

const Widgets = async () => {
  const { allIds, byId } = await getWidgetsListAPI()
  const widgets = allIds.map((id) => byId[id!])
  // …
}
```

**Client Component** — subscribe to one slice:

```tsx
'use client'
const widgets = useWidgetsListStore.use.list()
const getWidgetsList = useWidgetsListStore.use.getWidgetsList()
```
