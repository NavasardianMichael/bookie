import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getCodeByPhoneNumberAPI, getMeAPI, logoutAPI, validatePhoneNumberCodeAPI } from '@api/auth/main'
import { appendSelectors } from '@store/appendSelectors'
import { SIGN_ON_STEPS } from '@constants/auth'
import { errorMiddleware } from '@helpers/store'
import { AuthActions, AuthState } from './types'

const initialState: AuthState = {
  userType: null,
  profileId: null,
  isSignedOn: false,
  phone: {
    code: 0,
    number: 0,
  },
  step: SIGN_ON_STEPS.accountTypeSelection,
  error: null,
  isPending: false,
}

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
          getCodeByPhoneNumber: async (payload) => {
            set({ phone: payload.phone, isPending: true, error: null })
            try {
              await getCodeByPhoneNumberAPI(payload)
            } finally {
              set({ isPending: false })
            }
          },
          validatePhoneNumberCode: async (payload) => {
            set({ isPending: true, error: null })
            try {
              const result = await validatePhoneNumberCodeAPI(payload)
              set({
                isSignedOn: true,
                userType: result.role,
                profileId: result.profileId,
                step: SIGN_ON_STEPS.profileCreated,
              })
              return result
            } finally {
              set({ isPending: false })
            }
          },
          getMe: async () => {
            set({ isPending: true })
            try {
              const session = await getMeAPI()
              set({ isSignedOn: true, userType: session.role, profileId: session.profileId })
              return session
            } catch {
              // A missing or expired session is the expected answer for a guest, not a fault.
              set({ isSignedOn: false, userType: null, profileId: null })
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
