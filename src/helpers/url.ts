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

/**
 * A website as a person types it → an absolute URL, or `undefined` when it is not one.
 *
 * A bare domain (`acme.am`) gains `https://`, because nobody types the scheme. Any scheme
 * but `http(s)` is refused: the value is rendered as a link on a public page, so
 * `javascript:` must never survive. A bare origin comes back without the trailing slash
 * `URL` adds, since the organization page prints the address as well as linking it.
 */
export const toWebsiteUrl = (text: string | undefined): string | undefined => {
  const trimmed = text?.trim()
  if (!trimmed) return undefined

  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    if (!url.hostname.includes('.')) return undefined
    return url.pathname === '/' && !url.search && !url.hash ? url.origin : url.href
  } catch {
    return undefined
  }
}
