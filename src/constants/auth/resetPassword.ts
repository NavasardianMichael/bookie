export const RESET_PASSWORD_FORM_INITIAL_VALUES = {
  newPassword: '',
  confirmPassword: '',
}

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
