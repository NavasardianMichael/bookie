'use client'

import { FC, useEffect, useState } from 'react'
import { Spin } from 'antd'
import { getGooglePendingAPI } from '@api/auth/main'
import { PendingGoogleAccount } from '@interfaces/auth'
import { classifyError } from '@helpers/error'

type State =
  | { status: 'off' | 'loading' | 'expired' }
  | { status: 'ready'; pending: PendingGoogleAccount }
  | { status: 'failed'; error: unknown }

/**
 * - `off` — an ordinary email registration;
 * - `loading` — reading the pending Google identity;
 * - `ready` — Google mode: prefill from `pending`, lock the email, no password;
 * - `expired` — Google mode was asked for but the identity is gone (it lives a few minutes
 *   in an httpOnly cookie), so the form falls back to email registration and says why;
 * - `failed` — the read itself failed (an outage); show it with a Retry.
 */
export type GoogleSignUp =
  | { status: 'off' | 'loading' | 'expired' }
  | { status: 'ready'; pending: PendingGoogleAccount }
  | { status: 'failed'; error: unknown; retry: () => void }

/**
 * A registration form's Google mode. The API's Google callback opens the registration page
 * for a first-time account with `?google=1` (`GOOGLE_SIGN_UP_QUERY`), and the page passes
 * that down as `requested`.
 *
 * The identity is read only when asked for, never probed on every visit: an abandoned
 * Google attempt leaves its cookie behind, and silently turning a later email sign-up on
 * the same browser into that Google account would be worse than asking again.
 */
export const useGoogleSignUp = (requested: boolean): GoogleSignUp => {
  const [state, setState] = useState<State>(requested ? { status: 'loading' } : { status: 'off' })
  /** Bumped by Retry to read the identity again. */
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!requested) return
    let cancelled = false

    getGooglePendingAPI()
      .then((pending) => {
        if (!cancelled) setState({ status: 'ready', pending })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // 401/404: the cookie expired or the flow never started. Registration still works
        // without it, so that is a fallback rather than an error screen.
        const { kind } = classifyError(error)
        setState(kind === 'unauthorized' || kind === 'notFound' ? { status: 'expired' } : { status: 'failed', error })
      })

    return () => {
      cancelled = true
    }
  }, [requested, attempt])

  if (state.status !== 'failed') return state
  return {
    ...state,
    retry: () => {
      setState({ status: 'loading' })
      setAttempt((current) => current + 1)
    },
  }
}

/** Shown in the form's place while the pending identity is read. */
export const GoogleSignUpWaiting: FC = () => (
  <div className='flex justify-center py-10'>
    <Spin size='large' />
  </div>
)
