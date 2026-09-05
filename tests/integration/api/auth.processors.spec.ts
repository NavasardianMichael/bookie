import { describe, expect, it } from 'vitest'
import {
  processGetCodeResponse,
  processGetMeResponse,
  processValidatePhoneNumberCodeResponse,
} from '@api/auth/processors'
import { LoginResult, Session } from '@interfaces/auth'

const envelope = <T>(value: T) => ({ value, error: null })

describe('processValidatePhoneNumberCodeResponse', () => {
  // The login response is what decides where the funnel goes: `role` picks consumer vs
  // provider onboarding and `isNewUser` keeps a returning sign-in off the success screen.
  // It used to be processed by processGetCodeResponse, which discards the body entirely.
  it('unwraps the login verdict', () => {
    const result: LoginResult = { role: 'provider', profileId: 'p-1', isNewUser: true }

    expect(processValidatePhoneNumberCodeResponse(envelope(result))).toEqual(result)
  })

  it('preserves isNewUser: false for a returning sign-in', () => {
    const result: LoginResult = { role: 'consumer', profileId: 'c-9', isNewUser: false }

    expect(processValidatePhoneNumberCodeResponse(envelope(result)).isNewUser).toBe(false)
  })
})

describe('processGetMeResponse', () => {
  it('unwraps the session so a refresh can recover the role', () => {
    const session: Session = { role: 'consumer', profileId: 'c-1' }

    expect(processGetMeResponse(envelope(session))).toEqual(session)
  })
})

describe('processGetCodeResponse', () => {
  it('discards the body — sending an OTP returns nothing worth keeping', () => {
    expect(processGetCodeResponse(envelope(true))).toBeNull()
  })
})
