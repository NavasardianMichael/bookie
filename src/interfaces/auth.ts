import { LOGIN_TYPES } from '../constants/auth/login'

export type LoginTypes = (typeof LOGIN_TYPES)[keyof typeof LOGIN_TYPES]
