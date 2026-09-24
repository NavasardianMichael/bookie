'use client'

import { FC, useEffect, useState } from 'react'
import { Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { useAuthStore, useAuthStoreBase } from '@store/auth/store'
import { useRouter } from '@i18n/navigation'
import { ROUTES } from '@constants/routes'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { ErrorState } from '@components/ui/ErrorState'

/**
 * Where Google's flow lands once the API has set the session cookie.
 *
 * There is nothing to submit and nothing to read off the URL: the cookie is httpOnly, so
 * the only way to find out who just signed in is to ask. `getMe()` does that, fills the
 * store, and the role decides where to go — a provider into their workspace, a consumer
 * home.
 *
 * A `getMe()` that finds no session means the cookie never arrived. That is not an error
 * to display here, because the API already redirects real failures to
 * `/auth/sign-in?error=<code>` where the copy for each code lives; reaching this page
 * without a session means something outside that contract happened, so it falls back to
 * sign-in rather than inventing a message.
 *
 * An outage is different: the cookie may well be there and the API simply did not
 * answer. Sending that visitor to sign-in would make them do Google all over again for
 * nothing, so it shows the failure with a Retry instead.
 */
export const AuthCallbackClient: FC = () => {
  const t = useTranslations('Auth')
  const { replace } = useRouter()
  const getMe = useAuthStore.use.getMe()
  const sessionError = useAuthStore.use.error()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    void getMe().then((session) => {
      if (cancelled) return
      if (!session) {
        if (!useAuthStoreBase.getState().error) replace(ROUTES.signIn)
        return
      }
      replace(session.role === 'provider' ? ROUTES.providerProfile : ROUTES.home)
    })

    return () => {
      cancelled = true
    }
  }, [attempt, getMe, replace])

  if (sessionError) {
    return <ErrorState error={sessionError} onRetry={() => setAttempt((current) => current + 1)} />
  }

  return (
    <div className='flex flex-col items-center gap-4 py-6'>
      <Spin size='large' />
      <AppParagraph size='body-sm' className='m-0'>
        {t('callback.signingIn')}
      </AppParagraph>
    </div>
  )
}
