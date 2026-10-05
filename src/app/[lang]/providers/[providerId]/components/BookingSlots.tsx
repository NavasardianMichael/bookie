'use client'

import { FC, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'
import { useViewerTimeZone } from '@hooks/useViewerTimeZone'
import { TimeFormat } from '@interfaces/schedule'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { BookingSlot } from '@helpers/booking'
import { cn } from '@helpers/cn'
import { getTimeDisplayFormat, resolveTimeFormat } from '@helpers/timeFormat'
import { formatTimeZoneName, inTimeZone, isSameWallClock } from '@helpers/timeZone'
import { AppButton } from '@components/ui/AppButton'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { EmptyState } from '@components/ui/EmptyState'
import { CheckCircleIcon, ClockIcon } from '@components/ui/icons'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  date: Date | null
  slots: BookingSlot[]
  /** ISO start of the picked slot, or null while the visitor is still choosing. */
  selectedStart: string | null
  /** ISO starts already requested in this session, kept out of reach so nobody double-books. */
  requestedStarts: string[]
  serviceName?: string
  /** Pre-formatted, e.g. `70 USD`. Absent when the service carries no price. */
  servicePrice?: string
  /**
   * The provider's IANA zone — the clock every time here is written on, and the one the
   * header names. Absent for a provider who never set one: the slots were then stepped in
   * the visitor's own zone, so that is the zone named instead.
   */
  timeZone?: string
  /** The provider's 12/24-hour choice (`details.timeFormat`); absent, the reader's locale decides. */
  timeFormat?: TimeFormat
  isBooking: boolean
  onSelect: (startISO: string) => void
  onConfirm: () => void
  /** Defaults to `Booking.bookNow`. Manage-page reschedule passes a different label. */
  confirmLabel?: string
  /**
   * The signed-in viewer owns this page. The API refuses the write; the button is
   * disabled and a hint is shown so they do not fill the confirm sheet for nothing.
   */
  cannotBookOwn?: boolean
}

/**
 * One day's open times, and the confirm step for the slot picked out of them.
 *
 * Both used to live in an `AppSheet` opened by a calendar day click, which meant
 * the date, the time and the service were never on screen together and the
 * summary being confirmed was hidden behind a mask. Here the whole booking reads
 * top to bottom: service, day, time, confirm.
 */
export const BookingSlots: FC<Props> = ({
  date,
  slots,
  selectedStart,
  requestedStarts,
  serviceName,
  servicePrice,
  timeZone,
  timeFormat,
  isBooking,
  onSelect,
  onConfirm,
  confirmLabel,
  cannotBookOwn = false,
}) => {
  const t = useTranslations('Booking')
  const locale = useLocale()
  const viewerTimeZone = useViewerTimeZone()
  const timeDisplayFormat = getTimeDisplayFormat(resolveTimeFormat(timeFormat, locale))
  /**
   * Which clock the grid is on, said in words: `Armenia Standard Time (GMT+4)`. This used
   * to read "Local time", which was true only of the visitor's own clock — the one the hours
   * were wrongly stepped in — and said nothing about whose time a booker abroad was picking.
   */
  const shownTimeZone = timeZone ?? viewerTimeZone
  const timeZoneLabel = useMemo(
    () => (shownTimeZone ? formatTimeZoneName(shownTimeZone, locale) : null),
    [locale, shownTimeZone]
  )

  const handleSelect = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { start } = event.currentTarget.dataset
      if (start) onSelect(start)
    },
    [onSelect]
  )

  /**
   * The picked time on the visitor's own clock, when it reads differently from the
   * provider's — a booker in another zone should not have to do the arithmetic to know
   * when to turn up. The date is added only when the two clocks are on different days.
   */
  const viewerTime = useMemo(() => {
    if (!selectedStart || !timeZone || !viewerTimeZone) return null
    if (isSameWallClock(timeZone, viewerTimeZone, new Date(selectedStart))) return null
    const theirs = inTimeZone(selectedStart, timeZone)
    const yours = inTimeZone(selectedStart, viewerTimeZone)
    const sameDay = theirs.format(DAY_KEY_FORMAT) === yours.format(DAY_KEY_FORMAT)
    return t('yourTime', { time: yours.format(sameDay ? timeDisplayFormat : `MMM D, ${timeDisplayFormat}`) })
  }, [selectedStart, t, timeDisplayFormat, timeZone, viewerTimeZone])

  const summary = useMemo(() => {
    if (!selectedStart) return null
    const start = inTimeZone(selectedStart, timeZone)
    return [
      start.format('MMM D'),
      viewerTime ? `${start.format(timeDisplayFormat)} (${viewerTime})` : start.format(timeDisplayFormat),
      serviceName && servicePrice ? `${serviceName} (${servicePrice})` : serviceName,
    ]
      .filter(Boolean)
      .join(' • ')
  }, [selectedStart, serviceName, servicePrice, timeDisplayFormat, timeZone, viewerTime])

  const hasService = Boolean(serviceName)
  // Name only what is still missing — both, or the one left — so the strip does not
  // ask for a time when the service above is still empty.
  const promptTitle = selectedStart
    ? hasService
      ? t('readyToConfirm')
      : t('pickAService')
    : hasService
      ? t('pickATime')
      : t('pickServiceAndTime')
  // Same missing-selection rule as the title; the booking summary only lands once both are set.
  const promptHint =
    selectedStart && hasService
      ? summary
      : selectedStart
        ? t('pickAServiceHint')
        : hasService
          ? t('pickATimeHint')
          : t('pickServiceAndTimeHint')

  return (
    <Surface className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <AppTitle level='h3' size='h3'>
            {t('availableTimes')}
          </AppTitle>
          <AppParagraph size='body-sm' className='m-0'>
            {date ? dayjs(date).format('dddd, D MMMM') : t('noDatePicked')}
          </AppParagraph>
        </div>

        {timeZoneLabel && (
          <AppText size='body-sm' tone='muted' className='flex min-w-0 items-center gap-2'>
            <ClockIcon aria-hidden className='h-4 w-4 shrink-0' />
            {t('timesShownIn', { zone: timeZoneLabel })}
          </AppText>
        )}
      </div>

      {!date ? (
        <EmptyState title={t('pickDateFirst')} description={t('pickDateFirstBody')} />
      ) : !slots.length ? (
        <EmptyState title={t('noOpenTimes')} description={t('noOpenTimesBody')} />
      ) : (
        <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
          {slots.map((slot) => {
            const startISO = slot.start.toISOString()
            const taken = requestedStarts.includes(startISO)
            const isSelected = startISO === selectedStart

            return (
              <button
                key={startISO}
                type='button'
                data-start={startISO}
                onClick={handleSelect}
                disabled={taken || isBooking}
                aria-pressed={isSelected}
                className={cn(
                  'text-body-sm min-h-11 rounded-brand-sm border px-4 py-3 text-center font-bold transition-all',
                  'focus-visible:ring-brand/40 focus-visible:ring-2 focus-visible:outline-none',
                  taken
                    ? 'border-brand-border bg-surface-sunken text-brand-muted cursor-not-allowed line-through opacity-40'
                    : isSelected
                      ? 'border-brand bg-brand text-white shadow-md'
                      : 'border-brand-border text-brand-text hover:border-brand hover:text-brand cursor-pointer active:scale-[0.98]'
                )}
              >
                {inTimeZone(slot.start, timeZone).format(timeDisplayFormat)}
              </button>
            )
          })}
        </div>
      )}

      {/* The confirm step stays mounted once a day is chosen, so the button never
          appears under the finger that just tapped a time. */}
      {!!date && !!slots.length && (
        <div className='border-brand-border bg-surface-sunken flex flex-col items-start gap-4 rounded-brand border border-dashed p-5 sm:p-6 md:flex-row md:items-center md:justify-between'>
          <div className='flex min-w-0 items-center gap-4'>
            <span
              aria-hidden
              className={cn(
                'bg-surface flex size-12 shrink-0 items-center justify-center rounded-brand-sm shadow-sm',
                selectedStart ? 'text-brand' : 'text-brand-300'
              )}
            >
              <CheckCircleIcon className='h-6 w-6' />
            </span>
            <div className='min-w-0'>
              <AppTitle level='h4' size='body'>
                {promptTitle}
              </AppTitle>
              <AppParagraph size='body-sm' className='m-0'>
                {promptHint}
              </AppParagraph>
            </div>
          </div>

          {/* Full width on mobile through Tailwind, not antd's `block`: that emits an
              unlayered `.ant-btn-block { width: 100% }`, which `md:w-auto` cannot beat. */}
          <div className='flex w-full flex-col gap-2 md:w-auto md:items-end'>
            <AppButton
              type='primary'
              size='large'
              disabled={!selectedStart || !hasService || cannotBookOwn}
              loading={isBooking}
              onClick={onConfirm}
              className='w-full md:w-auto'
            >
              {confirmLabel ?? t('bookNow')}
            </AppButton>
            {cannotBookOwn ? (
              <AppParagraph size='body-sm' className='m-0 text-center md:text-end'>
                {t('cannotBookOwn')}
              </AppParagraph>
            ) : null}
          </div>
        </div>
      )}
    </Surface>
  )
}
