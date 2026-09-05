import { GetCodeByPhoneNumberAPI, ValidatePhoneNumberCodeAPI } from '@api/auth/types'
import { PhoneNumber } from '@interfaces/app'
import { LoginResult, Session, SignOnStep, UserType } from '@interfaces/auth'
import { StateCommonProps } from '@interfaces/store'

export type AuthState = StateCommonProps & {
  isSignedOn: boolean
  phone: PhoneNumber
  userType: UserType | null
  /** The consumer or provider row id behind the session, once known. */
  profileId: string | null
  step: SignOnStep
}

export type AuthActions = {
  setAuthState: (payload: Partial<AuthState>) => void
  getCodeByPhoneNumber: (payload: GetCodeByPhoneNumberAPI['payload']) => Promise<void>
  /**
   * Resolves with the server's verdict so the caller can route on `role` and `isNewUser`
   * rather than guessing. Rejects on an invalid OTP — callers must not advance on reject.
   */
  validatePhoneNumberCode: (payload: ValidatePhoneNumberCodeAPI['payload']) => Promise<LoginResult>
  /** Recovers role and profileId after a refresh; the session cookie is httpOnly. */
  getMe: () => Promise<Session | null>
  logout: () => Promise<void>
}
