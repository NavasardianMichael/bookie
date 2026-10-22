'use client'

import { CSSProperties, FC, useEffect, useRef, useState, useTransition } from 'react'
import { GlobalOutlined } from '@ant-design/icons'
import { Select } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { setLocale } from '@i18n/actions'
import { LANG_PARAM, type Locale, LOCALE_LABELS, LOCALES } from '@i18n/config'
import { usePathname, useRouter } from '@i18n/navigation'
import { isLocaleFreePath } from '@i18n/pathname'
import { hasUnsavedChanges } from '@helpers/unsavedChangesGuard'

const OPTIONS = LOCALES.map((locale) => ({ value: locale, label: LOCALE_LABELS[locale] }))

/** Long enough to cross the gap between the control and its portaled popup. */
const CLOSE_DELAY_MS = 150

/**
 * The header nav's visible colour. `a.app-link-plain` sets `--brand-text-muted` unlayered,
 * so a Tailwind colour on this Select never reaches it — antd's own colour is unlayered
 * too. Inline styles are what land on the closed value, the globe, and the arrow.
 */
const HEADER_TEXT: CSSProperties = { color: 'var(--brand-text-muted)', fontWeight: 600 }

/**
 * Language picker used in the header and the footer.
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
 *
 * Hover opens the list, the same way the header account menu does. Click and
 * keyboard still open it. The popup stays on `document.body`: the footer and
 * the mobile drawer would clip a list portaled into the control.
 */
type Props = {
  className?: string
  /** Header uses `borderless`; footer keeps the default outlined field. */
  variant?: 'outlined' | 'borderless' | 'filled'
}

export const LanguageSwitcher: FC<Props> = ({ className = 'min-w-44', variant = 'outlined' }) => {
  const t = useTranslations('Language')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // A phone tap fires mouseenter and then click. Opening on that enter lets the
  // click toggle the list shut, so a tap would never stick.
  const fineHover = useRef(false)
  // The click that lands as the pointer arrives would toggle the list shut.
  // Swallow that one. A later click on the control still toggles it.
  const suppressClose = useRef(false)

  const cancelClose = () => {
    if (closeTimer.current === null) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      suppressClose.current = false
      setOpen(false)
    }, CLOSE_DELAY_MS)
  }

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => {
      fineHover.current = query.matches
    }
    sync()
    query.addEventListener('change', sync)
    return () => {
      query.removeEventListener('change', sync)
      cancelClose()
    }
  }, [])

  const openFromHover = () => {
    if (!fineHover.current) return
    cancelClose()
    suppressClose.current = true
    setOpen(true)
  }

  const closeFromHover = () => {
    if (!fineHover.current) return
    scheduleClose()
  }

  /**
   * The public provider page, `/p/<key>`, has no locale segment to swap: its language is the
   * `?lang=` parameter, so the switch rewrites that and keeps the rest of the query (the
   * picked service, the reviews page). Elsewhere the locale is the path's first segment.
   */
  const switchTo = (next: Locale) => {
    if (!isLocaleFreePath(pathname)) {
      router.replace(pathname, { locale: next })
      return
    }
    const query = new URLSearchParams(window.location.search)
    query.set(LANG_PARAM, next)
    router.replace(`${pathname}?${query.toString()}${window.location.hash}`)
  }

  const handleChange = (next: Locale) => {
    setOpen(false)
    suppressClose.current = false
    // The dialog only appears for a navigation that is still inside the click.
    // Waiting on the cookie first would let the gesture expire and the page
    // would change without asking. The URL already names the language.
    if (hasUnsavedChanges()) {
      void setLocale(next)
      switchTo(next)
      return
    }
    startTransition(async () => {
      await setLocale(next)
      switchTo(next)
    })
  }

  return (
    // The Select owns click and keyboard. This only keeps the hover open across
    // the move onto the list, which is portaled out of this box.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className='w-fit max-w-full'
      onMouseEnter={openFromHover}
      onMouseLeave={closeFromHover}
      onClickCapture={(event) => {
        if (!suppressClose.current) return
        suppressClose.current = false
        event.stopPropagation()
      }}
    >
      <Select<Locale>
        aria-label={t('switcherAriaLabel')}
        open={open}
        value={locale}
        options={OPTIONS}
        onChange={handleChange}
        onOpenChange={(next) => {
          if (next) cancelClose()
          setOpen(next)
        }}
        popupRender={(menu) => (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div onMouseEnter={openFromHover} onMouseLeave={closeFromHover}>
            {menu}
          </div>
        )}
        loading={isPending}
        variant={variant}
        popupMatchSelectWidth={false}
        classNames={{ popup: { root: 'app-scrollbar' } }}
        prefix={<GlobalOutlined aria-hidden />}
        styles={
          variant === 'borderless'
            ? { content: HEADER_TEXT, prefix: HEADER_TEXT, suffix: HEADER_TEXT }
            : undefined
        }
        className={className}
      />
    </div>
  )
}
