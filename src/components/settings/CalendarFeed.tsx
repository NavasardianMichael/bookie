'use client'

import { FC, ReactNode, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getCalendarFeedAPI, rotateCalendarFeedAPI } from '@api/calendar/main'
import { ROUTES } from '@constants/routes'
import { AppButton } from '@components/ui/AppButton'
import { AppConfirmModal } from '@components/ui/AppConfirmModal'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CopyableLinkValue } from '@components/ui/CopyableLinkValue'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  /** `personal.entitlements.calendarFeed` from the owner profile — Basic and up. */
  included: boolean
}

/**
 * The provider's private calendar feed: their bookings as an iCal subscription in Google,
 * Apple or Outlook calendar. The URL is the credential (`server/src/routes/calendar.ts`), so
 * it comes with a way to revoke it — Reset link issues a new one and the old stops working.
 *
 * Without the plan feature the block explains itself and points at the Plan tab instead of
 * loading a URL the API would refuse.
 */
export const CalendarFeed: FC<Props> = ({ included }) => {
  const t = useTranslations('Settings.notifications')

  const [url, setUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)
  const [confirming, setConfirming] = useState(false)

  const request = useMemo(() => ({ revision }), [revision])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = included && fulfilled !== request

  useEffect(() => {
    if (!included) return
    let cancelled = false
    void getCalendarFeedAPI()
      .then((loaded) => {
        if (cancelled) return
        setUrl(loaded)
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
  }, [included, request])

  const rotate = async (): Promise<void> => {
    setUrl(await rotateCalendarFeedAPI())
    setConfirming(false)
  }

  const body = (): ReactNode => {
    if (!included) {
      return (
        <AppParagraph size='body-sm' className='m-0'>
          {t.rich('calendarLocked', {
            plan: (chunks) => <AppLink href={ROUTES.providerProfilePlan}>{chunks}</AppLink>,
          })}
        </AppParagraph>
      )
    }
    if (loadError !== null) {
      return <ErrorAlert error={loadError} onRetry={() => setRevision((value) => value + 1)} retrying={loading} />
    }
    if (loading || !url) return <div className='bg-brand-100 h-10 animate-pulse rounded-brand-sm' />
    return (
      <div className='flex flex-col gap-3'>
        <CopyableLinkValue href={url} text={url} copyLabel={t('calendarCopy')} />
        <AppParagraph size='body-sm' className='m-0'>
          {t('calendarHint')}
        </AppParagraph>
        <div>
          <AppButton onClick={() => setConfirming(true)}>{t('calendarReset')}</AppButton>
        </div>
      </div>
    )
  }

  return (
    <Surface className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <AppTitle level='h2' size='h3'>
          {t('calendarTitle')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('calendarBody')}
        </AppParagraph>
      </div>
      {body()}
      <AppConfirmModal
        open={confirming}
        tone='danger'
        title={t('calendarResetTitle')}
        description={t('calendarResetBody')}
        okText={t('calendarReset')}
        onConfirm={rotate}
        onCancel={() => setConfirming(false)}
      />
    </Surface>
  )
}
