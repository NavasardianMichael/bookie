import { SITE_URL_FALLBACK } from '@constants/app'

/**
 * Trailing slash stripped so `absoluteUrl` never produces a doubled separator.
 *
 * In the browser the tab's origin wins. Otherwise a missing or wrong
 * `NEXT_PUBLIC_SITE_URL` makes share links point at another host while you are
 * on localhost, and the copied URL cannot open the page you are looking at.
 */
export const getSiteUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE_URL_FALLBACK).replace(/\/+$/, '')
}

export const absoluteUrl = (path: string): string => `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`
