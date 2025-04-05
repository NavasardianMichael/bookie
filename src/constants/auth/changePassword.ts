
export const CHANGE_PASSWORD_FORM_INITIAL_VALUES = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

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
