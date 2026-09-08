import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must be hoisted above the store import — the store imports the API module eagerly.
vi.mock('@api/providers/main', () => ({
  getProvidersListAPI: vi.fn(),
}))

const { getProvidersListAPI } = await import('@api/providers/main')
const { useProvidersListStoreBase, useProvidersListStore } = await import('@store/providers/list/store')

const EMPTY_PAGINATION = { total: 0, page: 1, perPage: 0, pageCount: 1 }
const EMPTY = { list: { allIds: [], byId: {} }, pagination: EMPTY_PAGINATION, isPending: false, error: null }

const basicProvider = (id: string) => ({ id, basic: { firstName: 'Ada', lastName: 'L', available: true } })

describe('providers list store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProvidersListStoreBase.setState(EMPTY)
  })

  it('starts empty', () => {
    expect(useProvidersListStoreBase.getState().list).toEqual({ allIds: [], byId: {} })
  })

  it('setProvidersListState replaces top-level fields', () => {
    useProvidersListStoreBase.getState().setProvidersListState({ isPending: true })

    expect(useProvidersListStoreBase.getState().isPending).toBe(true)
    // …without disturbing the rest of the slice.
    expect(useProvidersListStoreBase.getState().list).toEqual({ allIds: [], byId: {} })
  })

  it('setProvidersList merges into the list', () => {
    const provider = basicProvider('a')
    useProvidersListStoreBase.getState().setProvidersList({ allIds: ['a'], byId: { a: provider } } as never)

    expect(useProvidersListStoreBase.getState().list.allIds).toEqual(['a'])
  })

  it('getProvidersList stores both the rows and the served window', async () => {
    const list = { allIds: ['a'], byId: { a: basicProvider('a') } }
    const pagination = { total: 12, page: 2, perPage: 9, pageCount: 2 }
    vi.mocked(getProvidersListAPI).mockResolvedValue({ list, pagination } as never)

    await useProvidersListStoreBase.getState().getProvidersList()

    expect(getProvidersListAPI).toHaveBeenCalledOnce()
    expect(useProvidersListStoreBase.getState().list).toEqual(list)
    expect(useProvidersListStoreBase.getState().pagination).toEqual(pagination)
  })

  it('getProvidersList forwards its query to the API untouched', async () => {
    vi.mocked(getProvidersListAPI).mockResolvedValue({
      list: { allIds: [], byId: {} },
      pagination: EMPTY_PAGINATION,
    } as never)

    await useProvidersListStoreBase.getState().getProvidersList({ q: 'hair', page: 3 })

    expect(getProvidersListAPI).toHaveBeenCalledWith({ q: 'hair', page: 3 })
  })

  // The store layer must not swallow API failures — components rely on the rejection.
  it('getProvidersList propagates an API rejection', async () => {
    vi.mocked(getProvidersListAPI).mockRejectedValue(new Error('boom'))

    await expect(useProvidersListStoreBase.getState().getProvidersList()).rejects.toThrow('boom')
  })
})

describe('appendSelectors', () => {
  it('exposes one selector per top-level key, state and actions alike', () => {
    // Keys are snapshotted at module init, so a field missing from initialState would
    // silently have no selector.
    expect(Object.keys(useProvidersListStore.use).sort()).toEqual(
      ['error', 'getProvidersList', 'isPending', 'list', 'pagination', 'setProvidersList', 'setProvidersListState'].sort()
    )
  })
})
