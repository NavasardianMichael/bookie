import { object, ref } from 'yup'
import { COMMON_SCHEMA_GENERATORS } from '../commons'

export const REGISTRATION_FORM_INITIAL_VALUES = {
  email: '',
  password: '',
  confirmedPassword: '',
  rememberMe: false,
}

export const REGISTRATION_FORM_TEMPLATE = [
  {
    name: 'email',
    type: 'email',
    placeholder: 'Enter Email',
    autocomplete: 'username',
  },
  {
    name: 'password',
    type: 'password',
    placeholder: 'Enter Password',
    autocomplete: 'current-password',
  },
  {
    name: 'confirmedPassword',
    type: 'password',
    placeholder: 'Confirm Password',
    autocomplete: 'new-password',
  },
] as const

export const REGISTRATION_FORM_VALIDATION_SCHEMA = object({
  email: COMMON_SCHEMA_GENERATORS.email,
  confirmedPassword: COMMON_SCHEMA_GENERATORS.password.oneOf([ref('password')], 'Passwords must match'),
  password: COMMON_SCHEMA_GENERATORS.password,
})
