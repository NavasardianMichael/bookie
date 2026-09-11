import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must be hoisted above the store import — the store imports the API module eagerly.
vi.mock('@api/auth/main', () => ({
  registerAPI: vi.fn(),
  loginAPI: vi.fn(),
  completeGoogleAPI: vi.fn(),
  getMeAPI: vi.fn(),
  logoutAPI: vi.fn(),
}))

const { registerAPI, loginAPI, completeGoogleAPI, getMeAPI, logoutAPI } = await import('@api/auth/main')
const { useAuthStoreBase } = await import('@store/auth/store')

const EMPTY = {
  userType: null,
  profileId: null,
  firstName: null,
  lastName: null,
  image: null,
  email: null,
  isSignedOn: false,
  step: 'accountTypeSelection',
  error: null,
  isPending: false,
}

const REGISTRATION = {
  role: 'consumer' as const,
  email: 'alex@example.com',
  password: 'a-strong-password',
  phone: { code: 374, number: 77000201 },
  profile: { firstName: 'Alex', lastName: 'Morgan' },
  locale: 'en',
}

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStoreBase.setState(EMPTY as never)
  })

  /**
   * Registration mails a link and returns `true` whether or not the address was already
   * taken, so treating it as a sign-in would both be wrong and leak which addresses exist.
   */
  it('register does not sign anyone in', async () => {
    vi.mocked(registerAPI).mockResolvedValue(undefined as never)

    await useAuthStoreBase.getState().register(REGISTRATION)

    expect(useAuthStoreBase.getState().isSignedOn).toBe(false)
    expect(useAuthStoreBase.getState().step).toBe('verifyEmail')
    expect(useAuthStoreBase.getState().isPending).toBe(false)
  })

  // The whole funnel's buttons are gated on isPending. Leaving it true on a rejection —
  // which is what this store used to do, having no try/finally — locks the user out of
  // retrying without a reload.
  it('resets isPending when registration fails', async () => {
    vi.mocked(registerAPI).mockRejectedValue(new Error('network'))

    await expect(useAuthStoreBase.getState().register(REGISTRATION)).rejects.toThrow('network')
    expect(useAuthStoreBase.getState().isPending).toBe(false)
  })

  it('login records the session', async () => {
    vi.mocked(loginAPI).mockResolvedValue({
      role: 'provider',
      profileId: 'p-1',
      firstName: 'Anna',
      email: 'anna@bookie.am',
    } as never)

    const session = await useAuthStoreBase.getState().login({ email: 'anna@bookie.am', password: 'pw' })

    expect(session.role).toBe('provider')
    expect(useAuthStoreBase.getState().userType).toBe('provider')
    expect(useAuthStoreBase.getState().profileId).toBe('p-1')
    expect(useAuthStoreBase.getState().email).toBe('anna@bookie.am')
    expect(useAuthStoreBase.getState().isSignedOn).toBe(true)
  })

  // Sign-in must be able to tell a rejected credential from an accepted one, and must not
  // half-apply a session on the way.
  it('propagates bad credentials and stays signed out', async () => {
    vi.mocked(loginAPI).mockRejectedValue(new Error('Invalid email or password'))

    await expect(
      useAuthStoreBase.getState().login({ email: 'anna@bookie.am', password: 'wrong' })
    ).rejects.toThrow('Invalid email or password')

    expect(useAuthStoreBase.getState().isSignedOn).toBe(false)
    expect(useAuthStoreBase.getState().userType).toBeNull()
    expect(useAuthStoreBase.getState().isPending).toBe(false)
  })

  // The one path that creates an account *and* signs in, because Google already verified
  // the address — there is no link to wait for.
  it('completeGoogle signs the new account in', async () => {
    vi.mocked(completeGoogleAPI).mockResolvedValue({ role: 'consumer', profileId: 'c-7' } as never)

    const session = await useAuthStoreBase.getState().completeGoogle({
      role: 'consumer',
      phone: { code: 374, number: 77000201 },
      profile: { firstName: 'Alex', lastName: 'Morgan' },
    })

    expect(session.profileId).toBe('c-7')
    expect(useAuthStoreBase.getState().isSignedOn).toBe(true)
    expect(useAuthStoreBase.getState().userType).toBe('consumer')
  })

  it('getMe hydrates the session after a refresh', async () => {
    vi.mocked(getMeAPI).mockResolvedValue({ role: 'consumer', profileId: 'c-3' } as never)

    const session = await useAuthStoreBase.getState().getMe()

    expect(session).toEqual({ role: 'consumer', profileId: 'c-3' })
    expect(useAuthStoreBase.getState().userType).toBe('consumer')
  })

  // A guest has no session; that is an answer, not a fault, so it must not reject.
  it('getMe resolves null and clears state when there is no session', async () => {
    vi.mocked(getMeAPI).mockRejectedValue(new Error('401'))

    await expect(useAuthStoreBase.getState().getMe()).resolves.toBeNull()
    expect(useAuthStoreBase.getState().isSignedOn).toBe(false)
    expect(useAuthStoreBase.getState().isPending).toBe(false)
  })

  it('logout clears the session even if the request fails', async () => {
    useAuthStoreBase.setState({ isSignedOn: true, userType: 'provider', profileId: 'p-1' } as never)
    vi.mocked(logoutAPI).mockRejectedValue(new Error('offline'))

    await expect(useAuthStoreBase.getState().logout()).rejects.toThrow('offline')

    expect(useAuthStoreBase.getState().isSignedOn).toBe(false)
    expect(useAuthStoreBase.getState().userType).toBeNull()
    expect(useAuthStoreBase.getState().profileId).toBeNull()
  })
})
