'use client'

import { FC, useTransition } from 'react'
import { GlobalOutlined } from '@ant-design/icons'
import { Select } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { setLocale } from '@i18n/actions'
import { type Locale, LOCALE_LABELS, LOCALES } from '@i18n/config'
import { usePathname, useRouter } from '@i18n/navigation'

const OPTIONS = LOCALES.map((locale) => ({ value: locale, label: LOCALE_LABELS[locale] }))

/**
 * The only way a user changes language, since the locale is not in the URL.
 *
 * Labels are endonyms and deliberately not translated — someone who cannot read
 * the current UI language still has to be able to find their own.
 *
 * Switching **navigates**, it does not just re-render: the locale lives in the
 * path, so the same page in another language is a different URL. `usePathname`
 * here is next-intl's, which returns the path with no locale segment, and
 * `replace(..., { locale })` puts the new one back on — so `/es/providers`
 * becomes `/ja/providers` and the user stays where they were. `replace` rather
 * than `push` keeps the language switch out of the back-button history.
 *
 * The cookie write alongside it is what a *later* visit to an unprefixed URL
 * reads, so `/providers` opens in the language they picked last time. It is also
 * where the account-level write lands in Phase 4.
 *
 * `useTransition` keeps the old text on screen during the round trip instead of
 * flashing a spinner over the whole shell.
 */
export const LanguageSwitcher: FC = () => {
  const t = useTranslations('Language')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleChange = (next: Locale) => {
    startTransition(async () => {
      await setLocale(next)
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <Select<Locale>
      aria-label={t('switcherAriaLabel')}
      value={locale}
      options={OPTIONS}
      onChange={handleChange}
      loading={isPending}
      variant='borderless'
      popupMatchSelectWidth={false}
      prefix={<GlobalOutlined aria-hidden />}
      className='min-w-44'
    />
  )
}
