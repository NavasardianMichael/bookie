export const ENDPOINTS = {
  getCodeByPhoneNumber: '/identity/send-otp',
  validatePhoneNumberCode: '/identity/login',
  me: '/identity/me',
  logout: '/identity/logout',
} as const
