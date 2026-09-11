export const ENDPOINTS = {
  register: '/identity/register',
  login: '/identity/login',
  verifyEmail: '/identity/verify-email',
  resendVerification: '/identity/resend-verification',
  forgotPassword: '/identity/forgot-password',
  resetPassword: '/identity/reset-password',
  changePassword: '/identity/change-password',
  me: '/identity/me',
  logout: '/identity/logout',
  /** Phone is profile data now, so changing it needs no confirmation step. */
  changePhone: '/identity/phone',
  changeEmailSend: '/identity/change-email/send',
  changeEmailConfirm: '/identity/change-email/confirm',
  deleteAccount: '/identity/account',
  /**
   * A **browser navigation**, not an XHR — the API answers it with a redirect to Google
   * and finishes by redirecting back to the web app. Set `window.location` to it; fetching
   * it would follow the redirect chain in the background and set no cookie the user can use.
   */
  google: '/identity/google',
  googlePending: '/identity/google/pending',
  googleComplete: '/identity/google/complete',
} as const
