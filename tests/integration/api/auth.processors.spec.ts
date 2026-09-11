import { describe, expect, it } from 'vitest'
import {
  processForgotPasswordResponse,
  processGetMeResponse,
  processGooglePendingResponse,
  processLoginResponse,
  processRegisterResponse,
  processVerifyEmailResponse,
} from '@api/auth/processors'
import { PendingGoogleAccount, Session } from '@interfaces/auth'

const envelope = <T>(value: T) => ({ value, error: null })

describe('processLoginResponse', () => {
  // The login response decides where the app goes next: `role` picks the provider
  // workspace over the consumer home.
  it('unwraps the session', () => {
    const session: Session = { role: 'provider', profileId: 'p-1', userId: 'u-1', firstName: 'Anna' }

    expect(processLoginResponse(envelope(session))).toEqual(session)
  })
})

describe('processGetMeResponse', () => {
  it('unwraps the session so a refresh can recover the role', () => {
    const session: Session = { role: 'consumer', profileId: 'c-1' }

    expect(processGetMeResponse(envelope(session))).toEqual(session)
  })

  // The settings screens branch on these: a Google-only account has no password to change,
  // so it must not be offered a "current password" field.
  it('carries the credential flags a Google-only account depends on', () => {
    const session: Session = {
      role: 'consumer',
      profileId: 'c-1',
      authProvider: 'google',
      hasPassword: false,
      hasGoogle: true,
    }

    expect(processGetMeResponse(envelope(session))).toMatchObject({ hasPassword: false, hasGoogle: true })
  })
})

describe('processVerifyEmailResponse', () => {
  it('unwraps the confirmed address', () => {
    const value = { email: 'alex@example.com', emailVerifiedAt: '2026-09-11T10:00:00.000Z' }

    expect(processVerifyEmailResponse(envelope(value))).toEqual(value)
  })
})

describe('processGooglePendingResponse', () => {
  it('unwraps the parked identity, including a role Google could not supply', () => {
    const pending: PendingGoogleAccount = {
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Morgan',
      role: null,
    }

    expect(processGooglePendingResponse(envelope(pending))).toEqual(pending)
  })
})

/**
 * These two answer a bare `true` on **every** branch — a taken address, a new one, even a
 * failed send — because any difference would be an oracle for which addresses hold
 * accounts. Discarding the body here is what stops a caller branching on it and rebuilding
 * that oracle in the UI.
 */
describe('the anti-enumeration responses', () => {
  it('discards the register body', () => {
    expect(processRegisterResponse(envelope(true))).toBeNull()
  })

  it('discards the forgot-password body', () => {
    expect(processForgotPasswordResponse(envelope(true))).toBeNull()
  })
})
