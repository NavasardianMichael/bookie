import { object, ref } from 'yup'
import { COMMON_SCHEMA_GENERATORS } from '../commons'

export const RESET_PASSWORD_FORM_INITIAL_VALUES = {
  newPassword: '',
  confirmPassword: '',
}

export const RESET_PASSWORD_FORM_VALIDATION_SCHEMA = object({
  newPassword: COMMON_SCHEMA_GENERATORS.password,
  confirmPassword: COMMON_SCHEMA_GENERATORS.password.oneOf([ref('newPassword')], 'Passwords must match'),
})

export const RESET_PASSWORD_FORM_TEMPLATE = [
  {
    name: 'newPassword',
    placeholder: 'Enter New Password',
  },
  {
    name: 'confirmPassword',
    placeholder: 'Confirm New Password',
  },
] as const
