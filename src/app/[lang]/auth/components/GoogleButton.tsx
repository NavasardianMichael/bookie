'use client'

import { FC } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { buildGoogleSignInUrl } from '@api/auth/main'
import { UserType } from '@interfaces/auth'
import type { Locale } from '@i18n/config'
import { localePath } from '@i18n/pathname'
import { ROUTES } from '@constants/routes'
import { AppButton } from '@components/ui/AppButton'

type Props = {
  /** Preselects the role for a first-time Google user, skipping that question later. */
  role?: UserType
  disabled?: boolean
}

/**
 * Google's own mark, inline.
 *
 * Inline rather than an `<img>` from Google's CDN: the brand guidelines require these exact
 * four colours, and a remote asset would be a third-party request on the sign-in page plus
 * a broken button whenever it fails.
 */
const GoogleMark: FC = () => (
  <svg width='18' height='18' viewBox='0 0 18 18' xmlns='http://www.w3.org/2000/svg' aria-hidden focusable='false'>
    <path
      fill='#4285F4'
      d='M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z'
    />
    <path
      fill='#34A853'
      d='M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z'
    />
    <path
      fill='#FBBC05'
      d='M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z'
    />
    <path
      fill='#EA4335'
      d='M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z'
    />
  </svg>
)

/**
 * Starts Google sign-in with a **full page navigation**, not a fetch.
 *
 * The flow is a chain of top-level redirects — to Google, back to the API's callback, then
 * on to `/auth/callback` here — and the API sets its session cookie on its own origin part
 * way through. An XHR would follow that chain invisibly and leave the browser where it
 * started, holding no session.
 *
 * `returnPath` is where the API sends the browser afterwards. It is checked against
 * `lib/return-path.ts`'s allowlist server-side, so a value this component did not mint
 * cannot turn the callback into an open redirect.
 */
export const GoogleButton: FC<Props> = ({ role, disabled }) => {
  const t = useTranslations('Auth')
  // `useLocale` widens to string; the path builder wants the narrowed union.
  const locale = useLocale() as Locale

  const handleClick = () => {
    window.location.href = buildGoogleSignInUrl({
      intent: 'signin',
      role,
      returnPath: localePath(locale, ROUTES.authCallback),
    })
  }

  return (
    <AppButton
      type='default'
      size='large'
      block
      disabled={disabled}
      onClick={handleClick}
      icon={<GoogleMark />}
      className='flex items-center justify-center gap-2'
    >
      {t('continueWithGoogle')}
    </AppButton>
  )
}
