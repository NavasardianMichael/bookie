import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must be hoisted above the store import — the store imports the API module eagerly.
vi.mock('@api/auth/main', () => ({
  getCodeByPhoneNumberAPI: vi.fn(),
  validatePhoneNumberCodeAPI: vi.fn(),
  getMeAPI: vi.fn(),
  logoutAPI: vi.fn(),
}))

const { getCodeByPhoneNumberAPI, validatePhoneNumberCodeAPI, getMeAPI, logoutAPI } = await import('@api/auth/main')
const { useAuthStoreBase } = await import('@store/auth/store')

const EMPTY = {
  userType: null,
  profileId: null,
  isSignedOn: false,
  phone: { code: 0, number: 0 },
  step: 'accountTypeSelection',
  error: null,
  isPending: false,
}

const PHONE = { code: 374, number: 77000201 }

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStoreBase.setState(EMPTY as never)
  })

  it('records the phone the code was sent to', async () => {
    vi.mocked(getCodeByPhoneNumberAPI).mockResolvedValue(undefined as never)

    await useAuthStoreBase.getState().getCodeByPhoneNumber({ phone: PHONE })

    expect(useAuthStoreBase.getState().phone).toEqual(PHONE)
    expect(useAuthStoreBase.getState().isPending).toBe(false)
  })

  // The whole funnel's buttons are gated on isPending. Leaving it true on a rejection —
  // which is what this store used to do, having no try/finally — locks the user out of
  // retrying without a reload.
  it('resets isPending when sending the code fails', async () => {
    vi.mocked(getCodeByPhoneNumberAPI).mockRejectedValue(new Error('network'))

    await expect(useAuthStoreBase.getState().getCodeByPhoneNumber({ phone: PHONE })).rejects.toThrow('network')
    expect(useAuthStoreBase.getState().isPending).toBe(false)
  })

  it('records role and profileId from the login verdict', async () => {
    vi.mocked(validatePhoneNumberCodeAPI).mockResolvedValue({
      role: 'provider',
      profileId: 'p-1',
      isNewUser: true,
    } as never)

    const result = await useAuthStoreBase.getState().validatePhoneNumberCode({ phone: PHONE, otp: 123456 })

    expect(result).toEqual({ role: 'provider', profileId: 'p-1', isNewUser: true })
    expect(useAuthStoreBase.getState().userType).toBe('provider')
    expect(useAuthStoreBase.getState().profileId).toBe('p-1')
    expect(useAuthStoreBase.getState().isSignedOn).toBe(true)
  })

  // The OTP screen must be able to tell a rejected code from an accepted one — it used to
  // navigate to the success screen either way.
  it('propagates an invalid OTP and stays signed out', async () => {
    vi.mocked(validatePhoneNumberCodeAPI).mockRejectedValue(new Error('Invalid OTP'))

    await expect(
      useAuthStoreBase.getState().validatePhoneNumberCode({ phone: PHONE, otp: 111111 })
    ).rejects.toThrow('Invalid OTP')

    expect(useAuthStoreBase.getState().isSignedOn).toBe(false)
    expect(useAuthStoreBase.getState().userType).toBeNull()
    expect(useAuthStoreBase.getState().isPending).toBe(false)
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
