export const ENDPOINTS = {
  login: '/api/Identity/login',
  register: '/api/Identity/register',
  logout: '/api/Identity/logout',
  sendForgotPasswordInstructions: 'sendForgotPasswordInstructions',
  changePassword: 'changePassword',
  verifyToken: 'verifyToken',
  resetPassword: 'resetPassword',
  getProfile: '/api/Identity/userinfo',
  googleLogin: '/api/Identity/googleLogin',
  telegramLogin: '/api/Identity/tgLogin',
  payment: '/api/payments/payPalValidate',
} as const
