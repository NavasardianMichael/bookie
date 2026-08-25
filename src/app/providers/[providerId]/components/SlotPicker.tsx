'use client'

import { FC, useMemo } from 'react'
import { Flex, Tag } from 'antd'
import dayjs from 'dayjs'
import { SCHEDULE_DISPLAY_FORMAT } from '@constants/schedule'
import { BookingSlot, groupSlotsByPartOfDay } from '@helpers/booking'
import { cn } from '@helpers/cn'
import AppButton from '@components/ui/AppButton'
import AppSheet from '@components/ui/AppSheet'
import EmptyState from '@components/ui/EmptyState'

type Props = {
  open: boolean
  date: Date | null
  slots: BookingSlot[]
  /** ISO start of the highlighted slot, or null while nothing is picked yet. */
  selectedStart: string | null
  /** ISO starts already requested in this session, kept out of reach so nobody double-books. */
  requestedStarts: string[]
  serviceLabel?: string
  isBooking: boolean
  onSelect: (startISO: string) => void
  onConfirm: () => void
  onClose: () => void
}

/**
 * Every open slot for one day, laid out as pickable chips. Booking is a two-step
 * pick-then-confirm: tapping a slot in the calendar used to fire the request
 * immediately, so a mis-tap was an appointment.
 */
const SlotPicker: FC<Props> = ({
  open,
  date,
  slots,
  selectedStart,
  requestedStarts,
  serviceLabel,
  isBooking,
  onSelect,
  onConfirm,
  onClose,
}) => {
  const groups = useMemo(() => groupSlotsByPartOfDay(slots), [slots])

  const openCount = useMemo(
    () => slots.filter((slot) => !requestedStarts.includes(slot.start.toISOString())).length,
    [requestedStarts, slots]
  )

  const selectedLabel = selectedStart ? dayjs(selectedStart).format(SCHEDULE_DISPLAY_FORMAT) : null

  return (
    <AppSheet open={open} onClose={onClose} title={date ? dayjs(date).format('dddd, D MMMM') : undefined}>
      <div className='flex flex-col gap-5'>
        <Flex align='center' gap={8} wrap>
          <Tag color={openCount ? 'blue' : undefined} className='m-0'>
            {openCount === 1 ? '1 slot available' : `${openCount} slots available`}
          </Tag>
          {serviceLabel && <span className='text-body-sm'>{serviceLabel}</span>}
        </Flex>

        {openCount ? (
          groups.map((group) => (
            <section key={group.key} className='flex flex-col gap-2'>
              <h4 className='text-overline text-brand-text m-0 uppercase'>{group.label}</h4>
              <div className='grid grid-cols-2 gap-2 xs:grid-cols-3 sm:grid-cols-4'>
                {group.slots.map((slot) => {
                  const startISO = slot.start.toISOString()
                  const isRequested = requestedStarts.includes(startISO)

                  return (
                    <AppButton
                      key={startISO}
                      type={startISO === selectedStart ? 'primary' : 'default'}
                      aria-pressed={startISO === selectedStart}
                      disabled={isRequested}
                      onClick={() => onSelect(startISO)}
                      className={cn('tnum w-full px-1', isRequested && 'line-through')}
                      aria-label={
                        isRequested
                          ? `${dayjs(slot.start).format(SCHEDULE_DISPLAY_FORMAT)} — already requested`
                          : undefined
                      }
                    >
                      {dayjs(slot.start).format(SCHEDULE_DISPLAY_FORMAT)}
                    </AppButton>
                  )
                })}
              </div>
            </section>
          ))
        ) : (
          <EmptyState
            title='No open slots on this day'
            description='Pick another day in the calendar, or switch service — a shorter one may still fit.'
          />
        )}

        {!!openCount && (
          <div className='bg-surface border-brand-border-subtle sticky bottom-0 border-t pt-4'>
            <AppButton type='primary' block disabled={!selectedStart} loading={isBooking} onClick={onConfirm}>
              {selectedLabel ? `Book ${selectedLabel}` : 'Select a time'}
            </AppButton>
          </div>
        )}
      </div>
    </AppSheet>
  )
}

export default SlotPicker
