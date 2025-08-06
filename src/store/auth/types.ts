import { GetCodeByPhoneNumberAPI, ValidatePhoneNumberCodeAPI } from '@api/auth/types'
import { PhoneNumber } from '@interfaces/app'
import { SignOnStep, UserType } from '@interfaces/auth'
import { StateCommonProps } from '@interfaces/store'

export type AuthState = StateCommonProps & {
  isSignedOn: boolean
  phone: PhoneNumber
  userType: UserType | null
  step: SignOnStep
}
export type AuthActions = {
  setAuthState: (payload: Partial<AuthState>) => void
  getCodeByPhoneNumber: (payload: GetCodeByPhoneNumberAPI['payload']) => Promise<void>
  validatePhoneNumberCode: (payload: ValidatePhoneNumberCodeAPI['payload']) => Promise<void>
}
