'use client'

import { FC, useEffect, useRef, useState } from 'react'
import { Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { verifyEmailAPI } from '@api/auth/main'
import { AUTH_ERROR_CODES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { ErrorCopyOverrides } from '@helpers/error'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { CheckCircleIcon, MailIcon } from '@components/ui/icons'

type Props = {
  /**
   * The one-time token from the emailed link. Absent is the **ordinary** case, not an
   * error: both registration forms land here with a bare URL to say "check your inbox",
   * and the token only ever arrives when the visitor returns from that inbox.
   */
  token?: string
}

type Status = 'sent' | 'verifying' | 'done' | 'failed'

/**
 * Confirms a signup address, or an email change — the API runs one handler for both.
 *
 * Verification is a **side effect on mount**, not something the visitor submits: they
 * already acted by clicking the link in their inbox, and asking them to press a second
 * button here would only add a step that can be abandoned.
 *
 * The route serves two arrivals, told apart by the token alone. Without one the visitor has
 * just registered and is being told to go and read their mail; with one they are back from
 * it. Treating the tokenless arrival as a failure — as this did — greeted every new account
 * with "we could not confirm this email" before any confirming had been attempted.
 */
export const VerifyEmailClient: FC<Props> = ({ token }) => {
  const t = useTranslations('Auth')
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'sent')
  const [error, setError] = useState<unknown>(null)
  /** Bumped by Retry to send the token again. */
  const [attempt, setAttempt] = useState(0)

  /**
   * One request per token per attempt. Development double-invokes effects, and a
   * `cancelled` flag alone does not stop that: it sent the one-time token twice, the first
   * call cleared its hash, and the second — the one whose answer counted — failed with
   * `invalidToken`, so every valid link read as a failure in dev. A ref survives the
   * double invocation, so the second run reuses the first run's request.
   */
  const inFlight = useRef<{ key: string; request: Promise<unknown> } | null>(null)

  useEffect(() => {
    if (!token) return

    const key = `${token}:${attempt}`
    if (inFlight.current?.key !== key) inFlight.current = { key, request: verifyEmailAPI({ token }) }
    let cancelled = false

    inFlight.current.request
      .then(() => {
        if (!cancelled) setStatus('done')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err)
        setStatus('failed')
      })

    return () => {
      cancelled = true
    }
  }, [token, attempt])

  const retry = () => {
    setStatus('verifying')
    setAttempt((current) => current + 1)
  }

  // A dead or already-used link is the expected failure, and its remedy is the sign-in
  // link below, so it reads as this page's own sentence rather than the generic token copy.
  const linkFailureCopy: ErrorCopyOverrides = {
    [AUTH_ERROR_CODES.invalidToken]: t('verifyEmail.failedBody'),
    [AUTH_ERROR_CODES.expiredToken]: t('verifyEmail.failedBody'),
  }

  if (status === 'sent') {
    return (
      <div className='flex flex-col items-center gap-3 text-center'>
        <span className='text-brand flex size-14 items-center justify-center rounded-full bg-brand-50'>
          <MailIcon className='h-7 w-7' />
        </span>
        <AppTitle level='h1' size='h2'>
          {t('verifyEmail.sentTitle')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('verifyEmail.sentBody')}
        </AppParagraph>
        <AppLink href={ROUTES.signIn} variant='button' className='mt-2'>
          {t('backToSignIn')}
        </AppLink>
      </div>
    )
  }

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
      <ErrorAlert error={error} overrides={linkFailureCopy} onRetry={retry} className='w-full text-start' />
      <AppLink href={ROUTES.signIn} variant='button' className='mt-2'>
        {t('backToSignIn')}
      </AppLink>
    </div>
  )
}
