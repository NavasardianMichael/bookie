import { GetCodeByPhoneNumberAPI, ValidatePhoneNumberCodeAPI } from '@api/auth/types'
import { SignOnStep, UserType } from '@interfaces/auth'
import { StateCommonProps } from '@interfaces/store'

export type AuthState = StateCommonProps & {
  isSignedOn: boolean
  phoneNumber: string
  userType: null | UserType
  step: SignOnStep
}
export type AuthActions = {
  setAuthState: (payload: Partial<AuthState>) => void
  getCodeByPhoneNumber: (payload: GetCodeByPhoneNumberAPI['payload']) => Promise<void>
  validatePhoneNumberCode: (payload: ValidatePhoneNumberCodeAPI['payload']) => Promise<void>
}
