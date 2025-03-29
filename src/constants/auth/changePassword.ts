import { object, ref } from 'yup'
import { COMMON_SCHEMA_GENERATORS } from '../commons'

export const CHANGE_PASSWORD_FORM_INITIAL_VALUES = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export const CHANGE_PASSWORD_FORM_VALIDATION_SCHEMA = object({
  currentPassword: COMMON_SCHEMA_GENERATORS.password,
  newPassword: COMMON_SCHEMA_GENERATORS.password,
  confirmPassword: COMMON_SCHEMA_GENERATORS.password.oneOf([ref('newPassword')], 'Passwords must match'),
})

export const CHANGE_PASSWORD_FORM_TEMPLATE = [
  {
    name: 'currentPassword',
    placeholder: 'Enter Old Password',
  },
  {
    name: 'newPassword',
    placeholder: 'Enter New Password',
  },
  {
    name: 'confirmPassword',
    placeholder: 'Confirm New Password',
  },
] as const
