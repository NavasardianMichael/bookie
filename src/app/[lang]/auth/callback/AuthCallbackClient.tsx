'use client'

import { FC, useEffect } from 'react'
import { Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useRouter } from '@i18n/navigation'
import { ROUTES } from '@constants/routes'
import { AppParagraph } from '@components/ui/bare/AppParagraph'

/**
 * Where Google's flow lands once the API has set the session cookie.
 *
 * There is nothing to submit and nothing to read off the URL: the cookie is httpOnly, so
 * the only way to find out who just signed in is to ask. `getMe()` does that, fills the
 * store, and the role decides where to go — a provider into their workspace, a consumer
 * home.
 *
 * A failed `getMe()` means the cookie never arrived. That is not an error to display here,
 * because the API already redirects real failures to `/auth/sign-in?error=<code>` where the
 * copy for each code lives; reaching this page without a session means something outside
 * that contract happened, so it falls back to sign-in rather than inventing a message.
 */
export const AuthCallbackClient: FC = () => {
  const t = useTranslations('Auth')
  const { replace } = useRouter()
  const getMe = useAuthStore.use.getMe()

  useEffect(() => {
    let cancelled = false

    void getMe().then((session) => {
      if (cancelled) return
      if (!session) {
        replace(ROUTES.signIn)
        return
      }
      replace(session.role === 'provider' ? ROUTES.providerProfile : ROUTES.home)
    })

    return () => {
      cancelled = true
    }
  }, [getMe, replace])

  return (
    <div className='flex flex-col items-center gap-4 py-6'>
      <Spin size='large' />
      <AppParagraph size='body-sm' className='m-0'>
        {t('callback.signingIn')}
      </AppParagraph>
    </div>
  )
}
