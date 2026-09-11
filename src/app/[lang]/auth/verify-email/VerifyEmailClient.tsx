'use client'

import { FC, useEffect, useState } from 'react'
import { Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { verifyEmailAPI } from '@api/auth/main'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CheckCircleIcon } from '@components/ui/icons'

type Props = {
  /** The one-time token from the emailed link. Absent means the link was malformed. */
  token?: string
}

type Status = 'verifying' | 'done' | 'failed'

/**
 * Confirms a signup address, or an email change — the API runs one handler for both.
 *
 * Verification is a **side effect on mount**, not something the visitor submits: they
 * already acted by clicking the link in their inbox, and asking them to press a second
 * button here would only add a step that can be abandoned.
 */
export const VerifyEmailClient: FC<Props> = ({ token }) => {
  const t = useTranslations('Auth')
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'failed')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    // Guards against React 18's double-invoked effects in development consuming the
    // one-time token twice — the second call would fail against an already-cleared hash.
    let cancelled = false

    verifyEmailAPI({ token })
      .then(() => {
        if (!cancelled) setStatus('done')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(processError(err).message)
        setStatus('failed')
      })

    return () => {
      cancelled = true
    }
  }, [token])

  if (status === 'verifying') {
    return (
      <div className='flex flex-col items-center gap-4 py-6'>
        <Spin size='large' />
        <AppParagraph size='body-sm' className='m-0'>
          {t('verifyEmail.verifying')}
        </AppParagraph>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className='flex flex-col items-center gap-3 text-center'>
        <span className='text-brand flex size-14 items-center justify-center rounded-full bg-brand-50'>
          <CheckCircleIcon className='h-7 w-7' />
        </span>
        <AppTitle level='h1' size='h2'>
          {t('verifyEmail.doneTitle')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('verifyEmail.doneBody')}
        </AppParagraph>
        <AppLink href={ROUTES.signIn} variant='button' className='mt-2'>
          {t('verifyEmail.signInNow')}
        </AppLink>
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center gap-3 text-center'>
      <AppTitle level='h1' size='h2'>
        {t('verifyEmail.failedTitle')}
      </AppTitle>
      <AppParagraph size='body-sm' className='m-0'>
        {error ?? t('verifyEmail.failedBody')}
      </AppParagraph>
      <AppLink href={ROUTES.signIn} variant='button' className='mt-2'>
        {t('backToSignIn')}
      </AppLink>
    </div>
  )
}
