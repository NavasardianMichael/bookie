import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must be hoisted above the store import — the store imports the API module eagerly.
vi.mock('@api/providers/main', () => ({
  getProvidersListAPI: vi.fn(),
}))

const { getProvidersListAPI } = await import('@api/providers/main')
const { useProvidersListStoreBase, useProvidersListStore } = await import('@store/providers/list/store')

const EMPTY = { list: { allIds: [], byId: {} }, isPending: false, error: null }

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

  it('getProvidersList stores what the API returns', async () => {
    const normalized = { allIds: ['a'], byId: { a: basicProvider('a') } }
    vi.mocked(getProvidersListAPI).mockResolvedValue(normalized as never)

    await useProvidersListStoreBase.getState().getProvidersList()

    expect(getProvidersListAPI).toHaveBeenCalledOnce()
    expect(useProvidersListStoreBase.getState().list).toEqual(normalized)
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
      ['error', 'getProvidersList', 'isPending', 'list', 'setProvidersList', 'setProvidersListState'].sort()
    )
  })
})
