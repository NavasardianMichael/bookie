import { CompleteGoogleAPI, LoginAPI, RegisterAPI } from '@api/auth/types'
import { Session, SignOnStep, UserType } from '@interfaces/auth'
import { StateCommonProps } from '@interfaces/store'

export type AuthState = StateCommonProps & {
  isSignedOn: boolean
  userType: UserType | null
  /** The consumer or provider row id behind the session, once known. */
  profileId: string | null
  firstName: string | null
  lastName: string | null
  image: string | null
  email: string | null
  step: SignOnStep
}

export type AuthActions = {
  setAuthState: (payload: Partial<AuthState>) => void
  /**
   * Creates the account and mails a verification link. Resolves on success but does **not**
   * sign anyone in — an unverified account cannot hold a session — so callers route to the
   * "check your inbox" screen rather than into the app.
   */
  register: (payload: RegisterAPI['payload']) => Promise<void>
  /** Rejects on bad credentials or an unverified account; callers must not advance on reject. */
  login: (payload: LoginAPI['payload']) => Promise<Session>
  /** Finishes a first-time Google sign-up once the role and phone have been collected. */
  completeGoogle: (payload: CompleteGoogleAPI['payload']) => Promise<Session>
  /** Recovers role and profileId after a refresh; the session cookie is httpOnly. */
  getMe: () => Promise<Session | null>
  logout: () => Promise<void>
}
