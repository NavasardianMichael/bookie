import type { Locale as AntdLocale } from 'antd/es/locale'
import { DEFAULT_LOCALE, type Locale } from './config'

/**
 * antd's own locale ids, which are language_REGION and do not match our BCP-47
 * codes. All 15 ship with antd — Armenian (`hy_AM`) included, which is usually
 * the one missing — so nothing here is hand-written.
 */
const ANTD_LOCALE_LOADERS: Record<Locale, () => Promise<{ default: AntdLocale }>> = {
  en: () => import('antd/locale/en_US'),
  es: () => import('antd/locale/es_ES'),
  'pt-BR': () => import('antd/locale/pt_BR'),
  fr: () => import('antd/locale/fr_FR'),
  it: () => import('antd/locale/it_IT'),
  de: () => import('antd/locale/de_DE'),
  ar: () => import('antd/locale/ar_EG'),
  'zh-CN': () => import('antd/locale/zh_CN'),
  ja: () => import('antd/locale/ja_JP'),
  hy: () => import('antd/locale/hy_AM'),
  id: () => import('antd/locale/id_ID'),
  ko: () => import('antd/locale/ko_KR'),
  uk: () => import('antd/locale/uk_UA'),
  pl: () => import('antd/locale/pl_PL'),
  th: () => import('antd/locale/th_TH'),
}

/**
 * Resolved **on the server** and handed to `ConfigProvider` as a prop, so only
 * the active locale crosses the wire (~6-10KB in the RSC payload) and none of
 * the 15 ever enter the client bundle.
 *
 * That works because antd's locale bundles are pure data — verified: zero
 * functions at any depth, so they survive serialization across the RSC
 * boundary. If a future antd version adds a function to one, this has to become
 * a client-side import keyed on the locale instead.
 */
export const getAntdLocale = async (locale: Locale): Promise<AntdLocale> => {
  const load = ANTD_LOCALE_LOADERS[locale] ?? ANTD_LOCALE_LOADERS[DEFAULT_LOCALE]
  const { default: antdLocale } = await load()
  return antdLocale
}
