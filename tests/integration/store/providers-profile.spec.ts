import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must be hoisted above the store import — the store imports the API module eagerly.
vi.mock('@api/providers/main', () => ({
  getProviderProfileAPI: vi.fn(),
  putProviderProfileAPI: vi.fn(),
  postProviderServiceAPI: vi.fn(),
  putProviderServiceAPI: vi.fn(),
  deleteProviderServiceAPI: vi.fn(),
}))

const { postProviderServiceAPI, putProviderServiceAPI, deleteProviderServiceAPI } = await import(
  '@api/providers/main'
)
const { useProviderProfileStoreBase, PROVIDER_PROFILE_INITIAL_STATE } = await import('@store/providers/profile/store')

const service = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: 'Haircut',
  duration: 45,
  categoryId: 'cat-1',
  ...overrides,
})

describe('provider profile store — services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProviderProfileStoreBase.setState(structuredClone(PROVIDER_PROFILE_INITIAL_STATE))
  })

  /**
   * The response is the only thing carrying the generated id and the stored
   * `/uploads/...` path. Merging the request payload instead — which is what this used
   * to do — filed a new service under a `File` object for its image.
   */
  it('postProviderService stores the API response, not the payload it sent', async () => {
    const saved = service('s-1', { image: '/uploads/stored.png' })
    vi.mocked(postProviderServiceAPI).mockResolvedValue(saved as never)

    const file = new File(['x'], 'crop.png', { type: 'image/png' })
    await useProviderProfileStoreBase.getState().postProviderService({
      providerId: 'p-1',
      service: { name: 'Haircut', duration: 45, categoryId: 'cat-1', image: file },
    })

    const { services } = useProviderProfileStoreBase.getState()
    expect(services.allIds).toEqual(['s-1'])
    expect(services.byId['s-1']).toEqual(saved)
    expect(services.byId['s-1'].image).toBe('/uploads/stored.png')
  })

  it('putProviderService replaces the stored service without duplicating its id', async () => {
    useProviderProfileStoreBase.setState({
      services: { allIds: ['s-1'], byId: { 's-1': service('s-1') } },
    } as never)

    const updated = service('s-1', { name: 'Beard trim', duration: 20 })
    vi.mocked(putProviderServiceAPI).mockResolvedValue(updated as never)

    await useProviderProfileStoreBase.getState().putProviderService({
      providerId: 'p-1',
      serviceId: 's-1',
      service: { name: 'Beard trim', duration: 20 },
    })

    const { services } = useProviderProfileStoreBase.getState()
    expect(services.allIds).toEqual(['s-1'])
    expect(services.byId['s-1']).toEqual(updated)
  })

  // A stale field left behind after an edit is the failure this guards: the write
  // replaces the entry rather than merging onto whatever was there before.
  it('putProviderService drops a field the update cleared', async () => {
    useProviderProfileStoreBase.setState({
      services: { allIds: ['s-1'], byId: { 's-1': service('s-1', { description: 'old', price: 30 }) } },
    } as never)

    vi.mocked(putProviderServiceAPI).mockResolvedValue(service('s-1') as never)

    await useProviderProfileStoreBase.getState().putProviderService({
      providerId: 'p-1',
      serviceId: 's-1',
      service: { description: '', price: '' },
    })

    expect(useProviderProfileStoreBase.getState().services.byId['s-1'].description).toBeUndefined()
    expect(useProviderProfileStoreBase.getState().services.byId['s-1'].price).toBeUndefined()
  })

  it('deleteProviderService removes the service from both halves of the slice', async () => {
    useProviderProfileStoreBase.setState({
      services: { allIds: ['s-1', 's-2'], byId: { 's-1': service('s-1'), 's-2': service('s-2') } },
    } as never)
    vi.mocked(deleteProviderServiceAPI).mockResolvedValue(undefined as never)

    await useProviderProfileStoreBase.getState().deleteProviderService({ providerId: 'p-1', serviceId: 's-1' })

    const { services } = useProviderProfileStoreBase.getState()
    expect(services.allIds).toEqual(['s-2'])
    expect(services.byId['s-1']).toBeUndefined()
  })

  // The store layer must not swallow API failures — the form renders the rejection.
  it('propagates a rejected save and leaves the slice untouched', async () => {
    vi.mocked(postProviderServiceAPI).mockRejectedValue(new Error('Unknown category'))

    await expect(
      useProviderProfileStoreBase.getState().postProviderService({
        providerId: 'p-1',
        service: { name: 'Haircut', duration: 45, categoryId: 'nope' },
      })
    ).rejects.toThrow('Unknown category')

    expect(useProviderProfileStoreBase.getState().services.allIds).toEqual([])
  })

  it('propagates a rejected delete and keeps the service', async () => {
    useProviderProfileStoreBase.setState({
      services: { allIds: ['s-1'], byId: { 's-1': service('s-1') } },
    } as never)
    vi.mocked(deleteProviderServiceAPI).mockRejectedValue(new Error('has appointments booked'))

    await expect(
      useProviderProfileStoreBase.getState().deleteProviderService({ providerId: 'p-1', serviceId: 's-1' })
    ).rejects.toThrow('has appointments booked')

    expect(useProviderProfileStoreBase.getState().services.allIds).toEqual(['s-1'])
  })
})
