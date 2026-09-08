'use client'

import { FC, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import { SCHEDULE_DISPLAY_FORMAT } from '@constants/schedule'
import { BookingSlot } from '@helpers/booking'
import { cn } from '@helpers/cn'
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
  isBooking: boolean
  onSelect: (startISO: string) => void
  onConfirm: () => void
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
  isBooking,
  onSelect,
  onConfirm,
}) => {
  const handleSelect = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const { start } = event.currentTarget.dataset
      if (start) onSelect(start)
    },
    [onSelect]
  )

  const summary = useMemo(() => {
    if (!selectedStart) return null
    return [
      dayjs(selectedStart).format('MMM D'),
      dayjs(selectedStart).format(SCHEDULE_DISPLAY_FORMAT),
      serviceName && servicePrice ? `${serviceName} (${servicePrice})` : serviceName,
    ]
      .filter(Boolean)
      .join(' • ')
  }, [selectedStart, serviceName, servicePrice])

  return (
    <Surface className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <AppTitle level='h3' size='h3'>
            Available times
          </AppTitle>
          <AppParagraph size='body-sm' className='m-0'>
            {date ? dayjs(date).format('dddd, D MMMM') : 'No date picked yet'}
          </AppParagraph>
        </div>

        <AppText size='body-sm' tone='muted' className='flex shrink-0 items-center gap-2'>
          <ClockIcon aria-hidden className='h-4 w-4' />
          Local time
        </AppText>
      </div>

      {!date ? (
        <EmptyState
          title='Pick a date first'
          description='Choose a day in the calendar above and its open times show up here.'
        />
      ) : !slots.length ? (
        <EmptyState
          title='No open times on this day'
          description='Try another day — days with availability are the ones you can select.'
        />
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
                {dayjs(slot.start).format(SCHEDULE_DISPLAY_FORMAT)}
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
                {selectedStart ? 'Ready to confirm?' : 'Pick a time'}
              </AppTitle>
              <AppParagraph size='body-sm' className='m-0'>
                {summary ?? 'Choose one of the times above to continue.'}
              </AppParagraph>
            </div>
          </div>

          {/* Full width on mobile through Tailwind, not antd's `block`: that emits an
              unlayered `.ant-btn-block { width: 100% }`, which `md:w-auto` cannot beat. */}
          <AppButton
            type='primary'
            size='large'
            disabled={!selectedStart}
            loading={isBooking}
            onClick={onConfirm}
            className='w-full md:w-auto'
          >
            Book now
          </AppButton>
        </div>
      )}
    </Surface>
  )
}
