import { PendingSignOn } from '@interfaces/auth'

export const LOCAL_STORAGE_KEYS = {
  pendingSignOn: 'pendingSignOn',
} as const

/**
 * The registration form and the OTP screen are two routes, but an account is only created
 * once the OTP verifies — so what the form collected has to survive one navigation. It is
 * held here rather than in the auth store because the store has no `persist` middleware, and
 * a refresh on the OTP screen would otherwise lose the whole form.
 *
 * Reads are total: anything unparseable or shaped wrong reads as `null`, so a stale or
 * hand-edited entry degrades to "nothing pending" instead of throwing mid-funnel.
 */
export const readPendingSignOn = (): PendingSignOn | null => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEYS.pendingSignOn)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as PendingSignOn
    const hasUsablePhone =
      Number.isFinite(parsed?.phone?.code) &&
      Number.isFinite(parsed?.phone?.number) &&
      parsed.phone.code > 0 &&
      parsed.phone.number > 0
    return hasUsablePhone ? parsed : null
  } catch {
    return null
  }
}

export const writePendingSignOn = (pending: PendingSignOn): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.pendingSignOn, JSON.stringify(pending))
}

/** Called once the account exists, so a later sign-in cannot replay a stale profile. */
export const clearPendingSignOn = (): void => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOCAL_STORAGE_KEYS.pendingSignOn)
}
