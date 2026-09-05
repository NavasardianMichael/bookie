import axios from 'axios'
import { ENDPOINTS as AUTH_ENDPOINTS } from '@api/auth/endpoints'
import { DEFAULT_LOCALE } from '@i18n/config'
import { localePath, splitLocaleFromPathname } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4142',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  formSerializer: {
    indexes: null,
  },
})

axiosInstance.interceptors.request.use((config) => {
  return config
})

/**
 * One place that reacts to an expired or missing session.
 *
 * This module is also imported by Server Components, so the redirect is browser-guarded.
 * It is a full-page navigation rather than a client push on purpose: that discards every
 * Zustand store along with the dead session, which is what clearing auth state would
 * otherwise have to do by hand — and this layer must not import store state
 * (see `src/api/CLAUDE.md`).
 *
 * `GET /identity/me` is a guest probe (Header, settings shell) — a 401 there is
 * "not signed in", not "kick them to sign-on". Also compare the locale-stripped
 * path: `/hy/auth/...` is still an auth URL, and a full-page bounce to the
 * unprefixed `/auth/...` would loop through the proxy forever.
 */
axiosInstance.interceptors.response.use(null, (error) => {
  const isUnauthorized = error.response?.status === 401
  if (!isUnauthorized || typeof window === 'undefined') {
    return Promise.reject(error)
  }

  const requestUrl = String(error.config?.url ?? '')
  if (requestUrl.includes(AUTH_ENDPOINTS.me)) {
    return Promise.reject(error)
  }

  const { locale, pathname } = splitLocaleFromPathname(window.location.pathname)
  if (pathname.startsWith(ROUTES.auth)) {
    return Promise.reject(error)
  }

  window.location.href = localePath(locale ?? DEFAULT_LOCALE, ROUTES.accountTypeSelection)
  return Promise.reject(error)
})
