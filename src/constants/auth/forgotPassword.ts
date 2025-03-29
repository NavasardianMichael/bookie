import { object } from 'yup'
import { COMMON_SCHEMA_GENERATORS } from '../commons'

export const FORGOT_PASSWORD_FORM_INITIAL_VALUES = {
  email: '',
}

export const FORGOT_PASSWORD_FORM_VALIDATION_SCHEMA = object({
  email: COMMON_SCHEMA_GENERATORS.email,
})
