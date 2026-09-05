/**
 * The 15 supported locales, in rollout order.
 *
 * BCP-47 codes carry a region subtag only where it disambiguates a market whose
 * copy genuinely differs — `pt-BR` (agendamento, celular, você) rather than
 * `pt-PT`, and `zh-CN` (Simplified) rather than `zh-TW`. Everything else is a
 * bare language code, because a region there would be a distinction the
 * catalogues do not actually make.
 *
 * There is deliberately **no locale segment in the URL**. The locale is resolved
 * per request from the viewed provider, then the signed-in user, then a cookie,
 * then `Accept-Language`. See `resolveLocale.ts` and `src/i18n/CLAUDE.md`.
 */
export const LOCALES = [
  'en',
  'es',
  'pt-BR',
  'fr',
  'it',
  'de',
  'ar',
  'zh-CN',
  'ja',
  'hy',
  'id',
  'ko',
  'uk',
  'pl',
  'th',
] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** The cookie an explicit switcher choice writes. Read by `resolveLocale`. */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

/**
 * Set by `src/proxy.ts` on every request, because a Server Component cannot
 * otherwise see the path — and `resolveLocale` needs it to tell a provider's
 * public page (rendered in *that provider's* language) from everything else.
 */
export const PATHNAME_HEADER = 'x-pathname'

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale)

/** Right-to-left scripts. Drives `<html dir>` and antd's `ConfigProvider direction`. */
const RTL_LOCALES = new Set<Locale>(['ar'])

export type Direction = 'ltr' | 'rtl'

export const getDirection = (locale: Locale): Direction => (RTL_LOCALES.has(locale) ? 'rtl' : 'ltr')

/**
 * Endonyms — each language named in itself, which is what a language switcher
 * must show: someone who cannot read the current UI language still has to find
 * their own. Never translate these.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  ar: 'العربية',
  'zh-CN': '简体中文',
  ja: '日本語',
  hy: 'Հայերեն',
  id: 'Bahasa Indonesia',
  ko: '한국어',
  uk: 'Українська',
  pl: 'Polski',
  th: 'ไทย',
}
