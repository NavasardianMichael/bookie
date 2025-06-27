import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { getCodeByPhoneNumberAPI, validatePhoneNumberCodeAPI } from '@api/auth/main'
import { appendSelectors } from '@store/appendSelectors'
import { SIGN_ON_STEPS } from '@constants/auth'
import { AuthActions, AuthState } from './types'

const initialState: AuthState = {
  userType: null,
  isSignedOn: false,
  phoneNumber: '',
  step: SIGN_ON_STEPS.accountTypeSelection,
  error: null,
  isPending: false,
}

const useAuthStoreBase = create<AuthState & AuthActions>()(
  immer(
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
          set({ phoneNumber: payload.phoneNumber, isPending: true })
          await getCodeByPhoneNumberAPI(payload)

          // const nextStepName = NEXT_SIGN_ON_STEP_BY_CURRENT[state.step]
          // if (!nextStepName) return
          // const nextStepPath = SIGN_ON_STEP_PATH[nextStepName]
          // state.step = nextStepName
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

export const useAuthStore = appendSelectors(useAuthStoreBase)
