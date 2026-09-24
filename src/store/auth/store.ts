import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { completeGoogleAPI, getMeAPI, loginAPI, logoutAPI, registerAPI } from '@api/auth/main'
import { appendSelectors } from '@store/appendSelectors'
import { Session } from '@interfaces/auth'
import { SIGN_ON_STEPS } from '@constants/auth'
import { classifyError, processError } from '@helpers/error'
import { reportError } from '@helpers/reportError'
import { errorMiddleware } from '@helpers/store'
import { AuthActions, AuthState } from './types'

const initialState: AuthState = {
  userType: null,
  profileId: null,
  firstName: null,
  lastName: null,
  image: null,
  email: null,
  profiles: null,
  isSignedOn: false,
  step: SIGN_ON_STEPS.accountTypeSelection,
  error: null,
  isPending: false,
}

/** One shape for every path that ends in a live session, so none of them can drift. */
const signedOn = (session: Session): Partial<AuthState> => ({
  isSignedOn: true,
  userType: session.role,
  profileId: session.profileId,
  firstName: session.firstName ?? null,
  lastName: session.lastName ?? null,
  image: session.image ?? null,
  email: session.email ?? null,
  profiles: session.profiles ?? null,
})

export const useAuthStoreBase = create<AuthState & AuthActions>()(
  immer(
    errorMiddleware(
      combine(
        initialState,
        (set): AuthActions => ({
          setAuthState: (payload) => {
            set((state) => {
              return {
                ...state,
                ...payload,
              }
            })
          },
          // Every action below resets `isPending` in a `finally`. Without it a rejected
          // request leaves the whole funnel's buttons disabled forever — `errorMiddleware`
          // only reassigns `api.setState` and does not catch rejections thrown in here.
          register: async (payload) => {
            set({ isPending: true, error: null })
            try {
              await registerAPI(payload)
              // Deliberately no `signedOn` here: registration mails a link and returns
              // `true` whether or not the address was already taken.
              set({ step: SIGN_ON_STEPS.verifyEmail })
            } finally {
              set({ isPending: false })
            }
          },
          login: async (payload) => {
            set({ isPending: true, error: null })
            try {
              const session = await loginAPI(payload)
              set(signedOn(session))
              return session
            } finally {
              set({ isPending: false })
            }
          },
          completeGoogle: async (payload) => {
            set({ isPending: true, error: null })
            try {
              const session = await completeGoogleAPI(payload)
              set(signedOn(session))
              return session
            } finally {
              set({ isPending: false })
            }
          },
          getMe: async () => {
            set({ isPending: true, error: null })
            try {
              const session = await getMeAPI()
              set(signedOn(session))
              return session
            } catch (error) {
              // A missing or expired session (401) is the expected answer for a guest, not
              // a fault. Anything else — the API down, a 500, a timeout — also answers
              // `null`, so the Header and every other caller keep working, but it is
              // recorded in `error`: a caller that would otherwise bounce to sign-in
              // (`AccountSettingsLayout`, the Google callback) must not send a signed-in
              // user there in the middle of an outage.
              const isGuest = classifyError(error).kind === 'unauthorized'
              if (!isGuest) reportError(error, 'auth:getMe')
              set({
                isSignedOn: false,
                userType: null,
                profileId: null,
                firstName: null,
                lastName: null,
                image: null,
                email: null,
                error: isGuest ? null : processError(error),
              })
              return null
            } finally {
              set({ isPending: false })
            }
          },
          logout: async () => {
            set({ isPending: true })
            try {
              await logoutAPI()
            } finally {
              set({ ...initialState })
            }
          },
        })
      )
    )
  )
)

export const useAuthStore = appendSelectors(useAuthStoreBase)
