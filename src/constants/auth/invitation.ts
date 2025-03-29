import { mixed, object } from 'yup'
import { ROLES } from './profile'
import { COMMON_SCHEMA_GENERATORS } from '../commons'

export const INVITATION_FORM_INITIAL_VALUES = {
  email: '',
  role: ROLES.general,
} as const

export const INVITATION_FORM_VALIDATION_SCHEMA = object({
  email: COMMON_SCHEMA_GENERATORS.email,
  role: mixed().oneOf(Object.values(ROLES)),
})
