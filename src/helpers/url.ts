import { SITE_URL_FALLBACK } from '@constants/app'

/** Trailing slash stripped so `absoluteUrl` never produces a doubled separator. */
export const getSiteUrl = (): string => (process.env.NEXT_PUBLIC_SITE_URL || SITE_URL_FALLBACK).replace(/\/+$/, '')

export const absoluteUrl = (path: string): string => `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`
