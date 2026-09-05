export const ENDPOINTS = {
  getCodeByPhoneNumber: '/identity/send-otp',
  validatePhoneNumberCode: '/identity/login',
  me: '/identity/me',
  logout: '/identity/logout',
  changePhoneSendOtp: '/identity/change-phone/send-otp',
  changePhoneConfirm: '/identity/change-phone/confirm',
  changeEmailSendOtp: '/identity/change-email/send-otp',
  changeEmailConfirm: '/identity/change-email/confirm',
} as const
