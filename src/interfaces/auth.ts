import { SIGN_ON_STEPS, USER_TYPES } from '@constants/auth'

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES]

export type SignOnStep = (typeof SIGN_ON_STEPS)[keyof typeof SIGN_ON_STEPS]
