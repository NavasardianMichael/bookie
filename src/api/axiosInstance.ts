import axios from 'axios'
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
 */
axiosInstance.interceptors.response.use(null, (error) => {
  const isUnauthorized = error.response?.status === 401

  if (isUnauthorized && typeof window !== 'undefined' && !window.location.pathname.startsWith(ROUTES.auth)) {
    window.location.href = ROUTES.accountTypeSelection
  }

  return Promise.reject(error)
})
