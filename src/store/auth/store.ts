import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getCodeByPhoneNumberAPI, validatePhoneNumberCodeAPI } from '@api/auth/main'
import { appendSelectors } from '@store/appendSelectors'
import { SIGN_ON_STEPS } from '@constants/auth'
import { errorMiddleware } from '@helpers/store'
import { AuthActions, AuthState } from './types'

const initialState: AuthState = {
  userType: null,
  isSignedOn: false,
  phone: {
    code: 0,
    number: 0,
  },
  step: SIGN_ON_STEPS.accountTypeSelection,
  error: null,
  isPending: false,
}

const useAuthStoreBase = create<AuthState & AuthActions>()(
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
          getCodeByPhoneNumber: async (payload) => {
            set({ phone: payload.phone, isPending: true })
            await getCodeByPhoneNumberAPI(payload)
            set({ isPending: false })
          },
          validatePhoneNumberCode: async (payload) => {
            set({ isPending: true })
            await validatePhoneNumberCodeAPI(payload)
            set({ isPending: false })
          },
        })
      )
    )
  )
)

export const useAuthStore = appendSelectors(useAuthStoreBase)
