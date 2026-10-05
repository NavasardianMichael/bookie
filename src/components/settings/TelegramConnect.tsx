'use client'

import { FC, ReactNode, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { deleteTelegramLinkAPI, getTelegramStatusAPI, postTelegramLinkAPI } from '@api/telegram/main'
import { useErrorToast } from '@hooks/useErrorToast'
import { TelegramStatus } from '@interfaces/settings'
import { ROUTES } from '@constants/routes'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  /**
   * A provider whose plan does not include Telegram: the account can still be linked (a
   * provider who also books others gets *those* notices there), but their own business
   * notices stay on email — said here, with the way to the Plan tab.
   */
  businessLocked?: boolean
  /** Copy for this workspace's own notices — a provider's business, or a client's bookings. */
  descriptionKey: 'telegramProviderBody' | 'telegramConsumerBody'
}

/** The deep link is good for 15 minutes; waiting for Start much past that is pointless. */
const WAIT_MS = 2 * 60 * 1000
const POLL_MS = 3000

/**
 * Connect Telegram, the second notification channel. The link is made in Telegram, never by
 * typing an id: Connect asks the API for a one-time `t.me/<bot>?start=…` link, the person
 * opens it and presses Start, and the bot ties that chat to the account. This block then
 * polls until the link shows up.
 *
 * The deep link is shown as a link to press rather than opened from script: a window opened
 * after an awaited request is what popup blockers block.
 */
export const TelegramConnect: FC<Props> = ({ businessLocked = false, descriptionKey }) => {
  const t = useTranslations('Settings.notifications')
  const showError = useErrorToast()

  const [status, setStatus] = useState<TelegramStatus | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)
  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== request

  useEffect(() => {
    let cancelled = false
    void getTelegramStatusAPI()
      .then((loaded) => {
        if (cancelled) return
        setStatus(loaded)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err)
      })
      .finally(() => {
        if (!cancelled) setFulfilled(request)
      })
    return () => {
      cancelled = true
    }
  }, [request])

  // While a Connect link is out, watch for the bot to report the chat linked.
  useEffect(() => {
    if (!linkUrl) return
    let cancelled = false
    const deadline = Date.now() + WAIT_MS
    const timer = setInterval(() => {
      if (Date.now() > deadline) {
        clearInterval(timer)
        return
      }
      void getTelegramStatusAPI()
        .then((loaded) => {
          if (cancelled || !loaded.linked) return
          clearInterval(timer)
          setStatus(loaded)
          setLinkUrl(null)
        })
        .catch(() => {
          // A dropped poll is retried on the next tick; the link itself is unaffected.
        })
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [linkUrl])

  const connect = async (): Promise<void> => {
    setBusy(true)
    try {
      setLinkUrl(await postTelegramLinkAPI())
    } catch (err) {
      showError(err, { title: t('telegramConnectFailed'), key: 'telegram' })
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async (): Promise<void> => {
    setBusy(true)
    try {
      await deleteTelegramLinkAPI()
      setStatus((previous) => (previous ? { ...previous, linked: false, username: undefined } : previous))
    } catch (err) {
      showError(err, { title: t('telegramDisconnectFailed'), key: 'telegram' })
    } finally {
      setBusy(false)
    }
  }

  const body = (): ReactNode => {
    if (loadError !== null) {
      return <ErrorAlert error={loadError} onRetry={() => setRevision((value) => value + 1)} retrying={loading} />
    }
    if (loading || !status) return <div className='bg-brand-100 h-10 animate-pulse rounded-brand-sm' />
    if (!status.available) {
      return (
        <AppText size='body-sm' tone='muted'>
          {t('telegramUnavailable')}
        </AppText>
      )
    }
    if (status.linked) {
      return (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <AppText size='body-sm' tone='default'>
            {status.username ? t('telegramConnectedAs', { username: status.username }) : t('telegramConnected')}
          </AppText>
          <AppButton loading={busy} onClick={() => void disconnect()}>
            {t('telegramDisconnect')}
          </AppButton>
        </div>
      )
    }
    if (linkUrl) {
      return (
        <div className='flex flex-col gap-2'>
          <AppParagraph size='body-sm' className='m-0'>
            {t('telegramOpenHint')}
          </AppParagraph>
          <div className='flex flex-wrap items-center gap-3'>
            <AppLink href={linkUrl} target='_blank' rel='noopener noreferrer' variant='button' tone='primary'>
              {t('telegramOpen')}
            </AppLink>
            <AppText size='caption' tone='muted' role='status'>
              {t('telegramWaiting')}
            </AppText>
          </div>
        </div>
      )
    }
    return (
      <div>
        <AppButton type='primary' loading={busy} onClick={() => void connect()}>
          {t('telegramConnect')}
        </AppButton>
      </div>
    )
  }

  return (
    <Surface className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <AppTitle level='h2' size='h3'>
          {t('telegramTitle')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t(descriptionKey)}
        </AppParagraph>
      </div>
      {businessLocked && (
        <AppParagraph size='body-sm' className='m-0'>
          {t.rich('telegramLocked', {
            plan: (chunks) => <AppLink href={ROUTES.providerProfilePlan}>{chunks}</AppLink>,
          })}
        </AppParagraph>
      )}
      {body()}
    </Surface>
  )
}
