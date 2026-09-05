import dayjs from 'dayjs'
import { DEFAULT_LOCALE, type Locale } from './config'

import 'dayjs/locale/ar'
import 'dayjs/locale/de'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/hy-am'
import 'dayjs/locale/id'
import 'dayjs/locale/it'
import 'dayjs/locale/ja'
import 'dayjs/locale/ko'
import 'dayjs/locale/pl'
import 'dayjs/locale/pt-br'
import 'dayjs/locale/th'
import 'dayjs/locale/uk'
import 'dayjs/locale/zh-cn'

/**
 * dayjs's own locale ids, which do not match our BCP-47 codes: it lowercases and
 * hyphenates (`zh-cn`), and names Armenian `hy-am`. `en` is built into the core
 * bundle and needs no import.
 */
const DAYJS_LOCALES: Record<Locale, string> = {
  en: 'en',
  es: 'es',
  'pt-BR': 'pt-br',
  fr: 'fr',
  it: 'it',
  de: 'de',
  ar: 'ar',
  'zh-CN': 'zh-cn',
  ja: 'ja',
  hy: 'hy-am',
  id: 'id',
  ko: 'ko',
  uk: 'uk',
  pl: 'pl',
  th: 'th',
}

/**
 * **Client only.** `dayjs.locale()` sets a module-level global, so calling it on
 * the server would leak one request's locale into another's render — two
 * concurrent requests in different languages would race. Server-side display
 * formatting goes through next-intl's `Intl`-backed formatter instead, which
 * takes the locale per call.
 *
 * On the client the global is correct and necessary: antd's DatePicker and
 * TimePicker read month and weekday names straight off dayjs, not off antd's own
 * `locale` prop.
 *
 * All 15 locales are imported statically rather than loaded on demand. Together
 * they are ~19KB raw (~6KB gzipped), which is cheaper than the class of bugs an
 * async load creates — a picker opening with English month names for a frame,
 * and a hydration mismatch on anything formatted during the first render.
 *
 * Safe to call repeatedly; it is idempotent.
 */
export const setDayjsLocale = (locale: Locale): void => {
  dayjs.locale(DAYJS_LOCALES[locale] ?? DAYJS_LOCALES[DEFAULT_LOCALE])
}
