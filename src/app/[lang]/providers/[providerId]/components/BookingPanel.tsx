'use client'

import { FC, useCallback, useMemo, useState } from 'react'
import { App } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useTranslations } from 'next-intl'
import { createAppointmentAPI } from '@api/appointments/main'
import { useAuthStore } from '@store/auth/store'
import { useSingleProviderStore } from '@store/providers/single/store'
import { DAY_KEY_FORMAT, SCHEDULE_DISPLAY_FORMAT } from '@constants/schedule'
import { countSlotsByDay, getSlotsForDate, getSlotsForDateRange } from '@helpers/booking'
import { processError } from '@helpers/error'
import { toPaymentMethods } from '@helpers/payment'
import { BookingConfirmSheet, BookingConfirmSubmission } from './BookingConfirmSheet'
import { BookingMonth } from './BookingMonth'
import { BookingSlots } from './BookingSlots'
import { BookingSummaryData } from './BookingSummary'

// Mandatory for the day-key parse below — `booking.ts` extends it for its own
// module only, and without it `dayjs(key, DAY_KEY_FORMAT)` is an Invalid Date.
dayjs.extend(customParseFormat)

const DEFAULT_DURATION_MINUTES = 30

type Props = {
  /**
   * Owned by `ProviderDetails` and set in the sibling service panel. The service
   * duration is the slot step, so it decides which days are bookable at all —
   * it is not a filter over an already-built calendar.
   */
  selectedServiceId?: string
}

/**
 * Booking, step two and three: which day, then which time.
 *
 * Replaces the FullCalendar month/week/day switcher whose day click opened a
 * slot sheet. `public_provider_profile` has no view switcher and no dialog — a
 * month grid picks the day in place and the open times sit in the panel under
 * it, both visible at once alongside the service picked above.
 */
export const BookingPanel: FC<Props> = ({ selectedServiceId }) => {
  const t = useTranslations('Booking')
  const { basic: basicProvider, details, id: providerId, services } = useSingleProviderStore()
  const { notification } = App.useApp()

  const [month, setMonth] = useState<Dayjs>(() => dayjs().startOf('month'))
  const [pickedDayKey, setPickedDayKey] = useState<string | null>(null)
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [requestedStarts, setRequestedStarts] = useState<string[]>([])
  const [isBooking, setIsBooking] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const service = selectedServiceId ? services.byId[selectedServiceId] : undefined
  const durationMinutes = service?.duration || DEFAULT_DURATION_MINUTES

  const monthSlots = useMemo(
    () =>
      getSlotsForDateRange({
        weekSchedule: details?.weekSchedule,
        start: month.startOf('month').toDate(),
        end: month.endOf('month').add(1, 'day').startOf('day').toDate(),
        durationMinutes,
      }),
    [details?.weekSchedule, durationMinutes, month]
  )

  const slotCountByDay = useMemo(() => {
    const counts = countSlotsByDay(monthSlots)
    if (!requestedStarts.length) return counts

    const remaining = new Map(counts)
    requestedStarts.forEach((iso) => {
      const key = dayjs(iso).format(DAY_KEY_FORMAT)
      const current = remaining.get(key)
      if (!current) return
      remaining.set(key, current - 1)
    })
    return remaining
  }, [monthSlots, requestedStarts])

  /** Insertion order is chronological, so the first entry is the earliest open day. */
  const firstOpenDayKey = useMemo(() => {
    for (const [key, count] of slotCountByDay) if (count > 0) return key
    return null
  }, [slotCountByDay])

  /**
   * Derived, never synced into state by an effect: the visitor's pick holds only
   * while it is still an open day of the month on screen, and otherwise the panel
   * falls back to the soonest open one.
   *
   * That covers three cases with one rule. The store is hydrated in an effect by
   * `ProviderDetails`, so the first pass has no schedule and no pick — the
   * fallback opens on the soonest bookable day instead of an empty time panel. A
   * service swap re-steps every day, and a longer duration can leave the picked
   * day with no room for a single slot. And paging the month re-points the panel
   * at the month being looked at, so the times shown always belong to a day
   * visible in the grid above them.
   */
  const selectedDayKey = useMemo(() => {
    if (pickedDayKey && (slotCountByDay.get(pickedDayKey) ?? 0) > 0) return pickedDayKey
    return firstOpenDayKey
  }, [firstOpenDayKey, pickedDayKey, slotCountByDay])

  const selectedDate = useMemo(
    () => (selectedDayKey ? dayjs(selectedDayKey, DAY_KEY_FORMAT).startOf('day').toDate() : null),
    [selectedDayKey]
  )

  const daySlots = useMemo(
    () =>
      selectedDate ? getSlotsForDate({ weekSchedule: details?.weekSchedule, date: selectedDate, durationMinutes }) : [],
    [details?.weekSchedule, durationMinutes, selectedDate]
  )

  /**
   * Derived rather than synced: a service swapped after a time was picked
   * re-steps the day, so the stored ISO can name a slot that no longer exists.
   */
  const validSelectedStart = useMemo(
    () => (daySlots.some((slot) => slot.start.toISOString() === selectedStart) ? selectedStart : null),
    [daySlots, selectedStart]
  )

  const servicePrice =
    service?.price !== undefined && service?.currency ? `${service.price} ${service.currency}` : undefined

  /**
   * Booking no longer needs a consumer role, only an identity. Any signed-in visitor
   * is one the API can resolve — a provider gets a Consumer profile created on their
   * own verified `User` — so the guest fields are for genuinely anonymous visitors.
   *
   * `getMe()` runs once from the Header, so this is normally settled long before a
   * click; `isPending` covers the window where it is not.
   */
  const isSignedOn = useAuthStore.use.isSignedOn()
  const isAuthPending = useAuthStore.use.isPending()

  /** Empty means the provider never configured a set; the picker then enables every method. */
  const paymentMethodOptions = useMemo(() => toPaymentMethods(details?.paymentInfo), [details?.paymentInfo])

  const booking = useMemo<BookingSummaryData | null>(() => {
    if (!validSelectedStart) return null
    return {
      providerName: `${basicProvider.firstName} ${basicProvider.lastName}`,
      serviceName: service?.name,
      serviceDescription: service?.description,
      startISO: validSelectedStart,
      durationMinutes,
      price: servicePrice,
      address: details?.location?.address,
      acceptedPaymentMethods: toPaymentMethods(details?.paymentInfo),
    }
  }, [
    basicProvider.firstName,
    basicProvider.lastName,
    details?.location?.address,
    details?.paymentInfo,
    durationMinutes,
    service?.description,
    service?.name,
    servicePrice,
    validSelectedStart,
  ])

  const handleSelectDay = useCallback((dayKey: string) => {
    setPickedDayKey(dayKey)
    setSelectedStart(null)
  }, [])

  const handleCloseConfirm = useCallback(() => setIsConfirmOpen(false), [])

  /**
   * "Book now" opens the confirm sheet; it no longer books. The visitor has picked a
   * service, a day and a time by this point, and none of that is what the sheet asks
   * about — it collects the notes, the payment intent, and (for someone we cannot
   * identify) who they are.
   */
  const handleOpenConfirm = useCallback(() => {
    if (!validSelectedStart || !providerId) return

    if (!selectedServiceId) {
      notification.warning({
        message: t('chooseServiceNotification'),
        description: t('chooseServiceNotificationBody'),
      })
      return
    }

    setIsConfirmOpen(true)
  }, [notification, providerId, selectedServiceId, t, validSelectedStart])

  const handleSubmitBooking = useCallback(
    async (submission: BookingConfirmSubmission) => {
      if (!validSelectedStart || !providerId || !selectedServiceId) return

      setIsBooking(true)
      try {
        await createAppointmentAPI({
          providerId,
          serviceId: selectedServiceId,
          startAt: validSelectedStart,
          notes: submission.notes,
          paymentMethods: submission.paymentMethods,
          guest: submission.guest,
        })
        setRequestedStarts((prev) => [...prev, validSelectedStart])
        setSelectedStart(null)
        setIsConfirmOpen(false)
        notification.success({
          message: t('requested'),
          description: t('requestedBody', {
            name: `${basicProvider.firstName} ${basicProvider.lastName}`,
            when: dayjs(validSelectedStart).format(`D MMMM, ${SCHEDULE_DISPLAY_FORMAT}`),
          }),
        })
      } catch (error) {
        // Sheet deliberately left open, so what was typed survives a failed submit —
        // a guest who lost their details to a 409 would have to retype all four fields.
        notification.error({ message: t('failed'), description: processError(error).message })
      } finally {
        setIsBooking(false)
      }
    },
    [
      basicProvider.firstName,
      basicProvider.lastName,
      notification,
      providerId,
      selectedServiceId,
      validSelectedStart,
      t,
    ]
  )

  return (
    <>
      <BookingMonth
        month={month}
        selectedDayKey={selectedDayKey}
        slotCountByDay={slotCountByDay}
        weekSchedule={details?.weekSchedule}
        serviceName={service?.name}
        onSelectDay={handleSelectDay}
        onMonthChange={setMonth}
      />

      <BookingSlots
        date={selectedDate}
        slots={daySlots}
        selectedStart={validSelectedStart}
        requestedStarts={requestedStarts}
        serviceName={service?.name}
        servicePrice={servicePrice}
        isBooking={isBooking}
        onSelect={setSelectedStart}
        onConfirm={handleOpenConfirm}
      />

      <BookingConfirmSheet
        open={isConfirmOpen}
        booking={booking}
        needsGuestDetails={!isSignedOn}
        isAuthPending={isAuthPending}
        paymentMethodOptions={paymentMethodOptions}
        paymentInfo={details?.paymentInfo}
        isBooking={isBooking}
        onClose={handleCloseConfirm}
        onSubmit={handleSubmitBooking}
      />
    </>
  )
}
