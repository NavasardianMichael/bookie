'use client'

import { FC, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { App } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { createAppointmentAPI } from '@api/appointments/main'
import { getProviderBusyAPI } from '@api/providers/main'
import { ProviderBusyInterval } from '@api/providers/types'
import { useAuthStore } from '@store/auth/store'
import { useSingleProviderStore } from '@store/providers/single/store'
import { useErrorToast } from '@hooks/useErrorToast'
import { BookingClosedReason } from '@interfaces/booking'
import { TimeFormat } from '@interfaces/schedule'
import { USER_TYPES } from '@constants/auth'
import { BUSY_WINDOW_PADDING_DAYS } from '@constants/booking'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import {
  countSlotsByDay,
  dropBusySlots,
  getBookingClosedReason,
  getSlotsForDate,
  getSlotsForDateRange,
  isSlotTakenError,
  resolveSelectedSlotStart,
} from '@helpers/booking'
import { buildMonthCells } from '@helpers/calendar'
import { processError } from '@helpers/error'
import { toPaymentMethods } from '@helpers/payment'
import { generateFriendlyPhoneNumber } from '@helpers/phone'
import { dayKeyOf, fixedOffsetZone, wholeOffsetHours, zonedTimeToDate } from '@helpers/timeZone'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import type { BookingConfirmSubmission, BookingCreated } from './BookingConfirmSheet'
import { BookingMonth } from './BookingMonth'
import { BookingSlots } from './BookingSlots'
import { BookingSummaryData } from './BookingSummary'
import {
  BOOKING_CALENDAR_ID,
  BOOKING_TIMES_ID,
  bookingContinueSection,
  bookingContinueTarget,
  PUBLIC_BOOK_NOW_EVENT,
  scrollToBookingSection,
} from './publicBookingCta'
import { getPublicClock, getServerPublicClock, publishPublicClock, subscribePublicClock } from './publicClock'

// Mandatory for the day-key parse below — `booking.ts` extends it for its own
// module only, and without it `dayjs(key, DAY_KEY_FORMAT)` is an Invalid Date.
dayjs.extend(customParseFormat)

/**
 * The confirm sheet (payment, guest details, share, QR) loads on the first Book now
 * and stays mounted, so opening it again does not fetch it.
 */
const BookingConfirmSheet = dynamic(
  () => import('./BookingConfirmSheet').then((mod) => mod.BookingConfirmSheet)
)

const DEFAULT_DURATION_MINUTES = 30

type Props = {
  /**
   * Owned by `ProviderDetails` and set in the sibling service panel. The service
   * duration is the slot step, so it decides which days are bookable at all —
   * it is not a filter over an already-built calendar.
   */
  selectedServiceId?: string
  /**
   * A submit was refused because the provider is not taking bookings online — paused, or
   * their monthly allowance spent while this page was open. `ProviderDetails` swaps this
   * panel for the contact notice, which is the only way forward from there.
   */
  onBookingClosed: (reason: BookingClosedReason) => void
}

/**
 * Booking, step two and three: which day, then which time.
 *
 * Replaces the FullCalendar month/week/day switcher whose day click opened a
 * slot sheet. `public_provider_profile` has no view switcher and no dialog — a
 * month grid picks the day in place and the open times sit in the panel under
 * it, both visible at once alongside the service picked above.
 */
export const BookingPanel: FC<Props> = ({ selectedServiceId, onBookingClosed }) => {
  const t = useTranslations('Booking')
  const tErrors = useTranslations('Errors')
  const locale = useLocale()
  const { basic: basicProvider, details, id: providerId, services } = useSingleProviderStore()
  const { notification } = App.useApp()
  const toast = useErrorToast()

  const [month, setMonth] = useState<Dayjs>(() => dayjs().startOf('month'))
  const [pickedDayKey, setPickedDayKey] = useState<string | null>(null)
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [requestedStarts, setRequestedStarts] = useState<string[]>([])
  const [isBooking, setIsBooking] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  /** Stays true after the first Book now so the loaded sheet is not fetched again. */
  const [confirmSheetMounted, setConfirmSheetMounted] = useState(false)
  const [created, setCreated] = useState<BookingCreated | null>(null)
  /**
   * Captured when the sheet opens. The live summary goes null once the booked
   * slot leaves the grid, and the sheet would swap its success body for a spinner.
   */
  const [confirmBooking, setConfirmBooking] = useState<BookingSummaryData | null>(null)
  const [busy, setBusy] = useState<ProviderBusyInterval[]>([])
  /** Bumped to re-ask who is booked — after a 409, after a successful booking, and by Retry. */
  const [busyRevision, setBusyRevision] = useState(0)
  /** The last busy read failed; the grid is showing the answer before it. */
  const [busyError, setBusyError] = useState<unknown>(null)

  /**
   * What is already taken in the month on screen, padded a week either side so the grid
   * cells that spill into the neighbouring months are covered by the same request.
   *
   * This is the half of the calendar that used not to exist. The panel stepped the
   * provider's opening hours and rendered every one of them as bookable, because nothing
   * told it otherwise — the server's slot endpoint answered in fixed 30-minute steps and
   * so could not speak for a 45-minute service, and no client ever called it
   * (`docs/BACKLOG.md` #6). Stepping stays here, where the service duration is known;
   * the server says only which intervals are gone.
   */
  const busyWindow = useMemo(
    () => ({
      providerId,
      from: month.startOf('month').subtract(BUSY_WINDOW_PADDING_DAYS, 'day').toISOString(),
      to: month.endOf('month').add(BUSY_WINDOW_PADDING_DAYS, 'day').toISOString(),
      revision: busyRevision,
    }),
    [busyRevision, month, providerId]
  )

  useEffect(() => {
    if (!busyWindow.providerId) return
    let cancelled = false

    void getProviderBusyAPI({
      id: busyWindow.providerId,
      from: busyWindow.from,
      to: busyWindow.to,
    })
      .then((intervals) => {
        if (cancelled) return
        setBusy(intervals)
        setBusyError(null)
      })
      // A failed read must not empty the set: `[]` would mean "everything is free",
      // which is the very claim that gets a visitor to a slot the API then refuses.
      // Keeping the last answer degrades to a stale grid, and the 409 still catches it —
      // but the visitor is told, above the times, and can ask again.
      .catch((error: unknown) => {
        if (!cancelled) setBusyError(error)
      })

    return () => {
      cancelled = true
    }
  }, [busyWindow])

  const service = selectedServiceId ? services.byId[selectedServiceId] : undefined
  const durationMinutes = service?.duration || DEFAULT_DURATION_MINUTES
  /**
   * The zone the provider's hours are written in. Every slot is stepped, counted and keyed
   * in it, so a visitor abroad books the provider's 09:00 rather than their own.
   * Undefined for a provider who never set one — the visitor's zone, as before.
   */
  const timeZone = details?.timeZone
  const timeFormat = details?.timeFormat
  /** One flag for the time-zone list and the 12/24-hour switch. Missing means shown. */
  const showClockChoices = details?.showClockChoices !== false
  /**
   * How the public page *prints* times. Shared with the opening hours, which live
   * in the other column. `null` keeps the provider's zone and clock. A picked
   * offset does not move the slot or the day the calendar is on.
   */
  const { offsetHours: displayOffsetHours, timeFormat: displayTimeFormat } = useSyncExternalStore(
    subscribePublicClock,
    getPublicClock,
    getServerPublicClock
  )
  const clockTimeFormat = displayTimeFormat ?? timeFormat

  /**
   * Stepped over the whole grid, not just the month: the days spilling in from the
   * neighbouring months are pickable too, so each needs its own answer to whether it is
   * bookable. The busy window's padding already covers them.
   */
  const gridSlots = useMemo(() => {
    const cells = buildMonthCells(month)
    return dropBusySlots(
      getSlotsForDateRange({
        weekSchedule: details?.weekSchedule,
        start: cells[0].date.toDate(),
        end: cells[cells.length - 1].date.add(1, 'day').toDate(),
        durationMinutes,
        timeZone,
      }),
      busy
    )
  }, [busy, details?.weekSchedule, durationMinutes, month, timeZone])

  const slotCountByDay = useMemo(() => {
    const counts = countSlotsByDay(gridSlots, timeZone)
    if (!requestedStarts.length) return counts

    const remaining = new Map(counts)
    requestedStarts.forEach((iso) => {
      const key = dayKeyOf(iso, timeZone)
      const current = remaining.get(key)
      if (!current) return
      remaining.set(key, current - 1)
    })
    return remaining
  }, [gridSlots, requestedStarts, timeZone])

  const isInVisibleMonth = useCallback(
    (dayKey: string) => dayjs(dayKey, DAY_KEY_FORMAT).isSame(month, 'month'),
    [month]
  )

  /**
   * Insertion order is chronological, so the first in-month entry is the earliest open
   * day. The grid's spill-over days are skipped — the fallback lands on the month the
   * visitor paged to, not on a leading day from the one before it.
   */
  const firstOpenDayKey = useMemo(() => {
    for (const [key, count] of slotCountByDay) if (count > 0 && isInVisibleMonth(key)) return key
    return null
  }, [isInVisibleMonth, slotCountByDay])

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
    if (pickedDayKey && isInVisibleMonth(pickedDayKey) && (slotCountByDay.get(pickedDayKey) ?? 0) > 0) {
      return pickedDayKey
    }
    return firstOpenDayKey
  }, [firstOpenDayKey, isInVisibleMonth, pickedDayKey, slotCountByDay])

  const selectedDate = useMemo(
    () => (selectedDayKey ? dayjs(selectedDayKey, DAY_KEY_FORMAT).startOf('day').toDate() : null),
    [selectedDayKey]
  )
  const providerOffsetHours = useMemo(() => {
    if (!timeZone) return null
    const at = selectedDayKey ? zonedTimeToDate(selectedDayKey, 12 * 60, timeZone) : new Date()
    return wholeOffsetHours(at, timeZone)
  }, [selectedDayKey, timeZone])
  const clockTimeZone = displayOffsetHours === null ? timeZone : fixedOffsetZone(displayOffsetHours)
  const handleDisplayOffset = useCallback(
    (hours: number) => {
      publishPublicClock({ offsetHours: hours === providerOffsetHours ? null : hours })
    },
    [providerOffsetHours]
  )
  const handleDisplayTimeFormat = useCallback((format: TimeFormat) => {
    publishPublicClock({ timeFormat: format })
  }, [])
  // The hours list lives in the other column. It shifts each weekday of this week,
  // so it has to hear which day the grid is on.
  useEffect(() => {
    publishPublicClock({ referenceDayKey: selectedDayKey })
  }, [selectedDayKey])
  // A different provider starts on their own clock. The day above is left to the other effect.
  // Skip the mount: the store is already empty, and resetting it would wipe a pick made
  // before this panel's id settles.
  const providerClockKey = useRef(providerId)
  useEffect(() => {
    if (providerClockKey.current === providerId) return
    providerClockKey.current = providerId
    publishPublicClock({ offsetHours: null, timeFormat: null })
  }, [providerId])

  const daySlots = useMemo(
    () =>
      selectedDate
        ? dropBusySlots(
            getSlotsForDate({ weekSchedule: details?.weekSchedule, date: selectedDate, durationMinutes, timeZone }),
            busy
          )
        : [],
    [busy, details?.weekSchedule, durationMinutes, selectedDate, timeZone]
  )

  /**
   * Derived rather than synced: a service swapped after a time was picked
   * re-steps the day, so the stored ISO can name a slot that no longer exists.
   * A day with one open time selects it here too, including after a busy refresh
   * leaves a single slot — an effect writing that back is what the lint rule forbids.
   */
  const validSelectedStart = useMemo(
    () => resolveSelectedSlotStart(daySlots, requestedStarts, selectedStart),
    [daySlots, requestedStarts, selectedStart]
  )

  const servicePrice =
    service?.price !== undefined && service?.currency ? `${service.price} ${service.currency}` : undefined
  const phone = details?.phone?.number
    ? generateFriendlyPhoneNumber(details.phone, { delimiter: ' ', prefix: '+' })
    : undefined

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
  const accountEmail = useAuthStore.use.email()
  const userType = useAuthStore.use.userType()
  const profileId = useAuthStore.use.profileId()
  // Same rule as the favourite heart and `POST /appointments`: a provider session
  // cannot book the page it owns.
  const cannotBookOwn = userType === USER_TYPES.provider && profileId === providerId

  /** Empty means the provider never configured a set; the picker then enables every method. */
  const paymentMethodOptions = useMemo(() => toPaymentMethods(details?.paymentInfo), [details?.paymentInfo])

  const booking = useMemo<BookingSummaryData | null>(() => {
    if (!validSelectedStart) return null
    return {
      providerName: `${basicProvider.firstName} ${basicProvider.lastName}`,
      serviceName: service?.name,
      serviceDescription: service?.description,
      startISO: validSelectedStart,
      timeZone: clockTimeZone,
      timeFormat: clockTimeFormat,
      durationMinutes,
      price: servicePrice,
      address: details?.location?.address,
      phone,
      paymentMethods: [],
    }
  }, [
    basicProvider.firstName,
    basicProvider.lastName,
    details?.location?.address,
    durationMinutes,
    phone,
    service?.description,
    service?.name,
    servicePrice,
    clockTimeFormat,
    clockTimeZone,
    validSelectedStart,
  ])

  /**
   * A spill-over day belongs to the neighbouring month, so picking one pages the grid
   * there — the same move a date picker makes. The pick then holds, because it is an
   * open day of the month now on screen.
   */
  const handleSelectDay = useCallback(
    (dayKey: string) => {
      setPickedDayKey(dayKey)
      setSelectedStart(null)
      if (!isInVisibleMonth(dayKey)) setMonth(dayjs(dayKey, DAY_KEY_FORMAT).startOf('month'))
    },
    [isInVisibleMonth]
  )

  const handleCloseConfirm = useCallback(() => {
    setIsConfirmOpen(false)
    setCreated(null)
    setConfirmBooking(null)
  }, [])

  const continueTarget = bookingContinueTarget({
    hasService: Boolean(selectedServiceId),
    hasDay: Boolean(selectedDate),
    hasTime: Boolean(validSelectedStart),
    cannotBookOwn,
  })

  /**
   * Both Book now controls. A step the page already filled — the only service, or
   * the only open time — is skipped. Anything still empty is scrolled into view;
   * the sheet opens only when service and time are both set, and the visitor is
   * allowed to book. The sheet collects notes, payment, and a guest's name.
   */
  const continueBooking = useCallback(() => {
    const section = bookingContinueSection(continueTarget)
    if (section) {
      if (continueTarget === 'service') {
        notification.warning({
          title: t('chooseServiceNotification'),
          description: validSelectedStart ? t('pickAServiceHint') : t('chooseServiceNotificationBody'),
        })
      }
      scrollToBookingSection(section)
      return
    }

    if (!providerId || !booking) return
    setConfirmBooking(booking)
    setConfirmSheetMounted(true)
    setIsConfirmOpen(true)
  }, [booking, continueTarget, notification, providerId, t, validSelectedStart])

  /** Identity-column Book now (mobile) asks the column through a DOM event. */
  useEffect(() => {
    window.addEventListener(PUBLIC_BOOK_NOW_EVENT, continueBooking)
    return () => window.removeEventListener(PUBLIC_BOOK_NOW_EVENT, continueBooking)
  }, [continueBooking])

  // A chosen time is the step before Book now, so the sheet chunk is usually here before the click.
  useEffect(() => {
    if (!selectedStart) return
    void import('./BookingConfirmSheet')
  }, [selectedStart])

  const handleSubmitBooking = useCallback(
    async (submission: BookingConfirmSubmission) => {
      // The time the sheet is confirming, not the live pick: a busy refresh while the sheet
      // is open can drop that slot from the grid, and reading the live value then made
      // Submit return without a word. If the time really has gone, the API's 409 says so.
      const startAt = confirmBooking?.startISO
      if (!startAt || !providerId || !selectedServiceId) return

      setIsBooking(true)
      try {
        const result = await createAppointmentAPI({
          providerId,
          serviceId: selectedServiceId,
          startAt,
          notes: submission.notes,
          paymentMethods: submission.paymentMethods,
          guest: submission.guest,
          locale,
        })
        setRequestedStarts((prev) => [...prev, startAt])
        // The booking we just made is now one of the taken intervals. Re-asking rather
        // than splicing it in locally also picks up anything else that landed while the
        // sheet was open, which is the same staleness this whole path is about.
        setBusyRevision((current) => current + 1)
        if (result.manageToken) {
          setCreated({
            manageToken: result.manageToken,
            emailSent: Boolean(result.emailSent),
            emailedTo: submission.guest?.email ?? accountEmail ?? undefined,
            paymentMethods: submission.paymentMethods ?? [],
            requiresApproval: Boolean(result.requiresApproval),
          })
        }
      } catch (error) {
        const processed = processError(error)

        /**
         * Somebody booked that time while this visitor was filling in the sheet.
         *
         * The one failure here the visitor can fix themselves, so it is answered
         * differently from every other: the slot is dropped from the grid, the time
         * selection is cleared so the dead slot cannot simply be resubmitted, and the
         * sheet closes back onto the day they were looking at with a message naming what
         * happened. It used to surface as `t('failed')` over a raw server string, in
         * front of a grid still offering the slot that had just been refused.
         *
         * Recognised by `isSlotTakenError`, not by the 409 alone — a withdrawn service
         * answers 409 too, and telling that visitor to pick another time sends them
         * round a loop with no exit.
         */
        if (isSlotTakenError(processed)) {
          setBusyRevision((current) => current + 1)
          setSelectedStart(null)
          setIsConfirmOpen(false)
          notification.warning({
            title: t('slotTaken'),
            description: t('slotTakenBody'),
          })
          return
        }

        /**
         * The provider stopped taking bookings online while the sheet was open. No other
         * time or service would go through either, so the sheet closes and the panel hands
         * over to the contact notice. The toast carries the catalogue copy for the code,
         * which the generic 409 override below cannot mask (`resolveErrorText`).
         */
        const closedReason = getBookingClosedReason(processed)
        if (closedReason) {
          setIsConfirmOpen(false)
          toast(error, { title: t('failed') })
          onBookingClosed(closedReason)
          return
        }

        // Sheet deliberately left open, so what was typed survives a failed submit —
        // a guest who lost their details to a 409 would have to retype all four fields.
        toast(error, { title: t('failed'), overrides: { 409: tErrors('conflicts.bookingUnavailable') } })
      } finally {
        setIsBooking(false)
      }
    },
    [
      accountEmail,
      confirmBooking?.startISO,
      locale,
      notification,
      onBookingClosed,
      providerId,
      selectedServiceId,
      t,
      tErrors,
      toast,
    ]
  )

  return (
    <>
      <div id={BOOKING_CALENDAR_ID}>
        <BookingMonth
          month={month}
          selectedDayKey={selectedDayKey}
          slotCountByDay={slotCountByDay}
          weekSchedule={details?.weekSchedule}
          timeZone={timeZone}
          serviceName={service?.name}
          onSelectDay={handleSelectDay}
          onMonthChange={setMonth}
        />
      </div>

      {busyError !== null && (
        <ErrorAlert
          tone='warning'
          error={busyError}
          title={tErrors('sections.busySlots')}
          onRetry={() => setBusyRevision((current) => current + 1)}
        />
      )}

      <div id={BOOKING_TIMES_ID}>
        <BookingSlots
          date={selectedDate}
          slots={daySlots}
          selectedStart={validSelectedStart}
          requestedStarts={requestedStarts}
          serviceName={service?.name}
          servicePrice={servicePrice}
          timeZone={clockTimeZone}
          offsetHours={displayOffsetHours ?? providerOffsetHours ?? undefined}
          onOffsetHoursChange={showClockChoices && timeZone ? handleDisplayOffset : undefined}
          timeFormat={clockTimeFormat}
          onTimeFormatChange={showClockChoices ? handleDisplayTimeFormat : undefined}
          isBooking={isBooking}
          onSelect={setSelectedStart}
          onConfirm={continueBooking}
          continuesToService
          cannotBookOwn={cannotBookOwn}
        />
      </div>

      {confirmSheetMounted && (
        <BookingConfirmSheet
          open={isConfirmOpen}
          booking={confirmBooking}
          needsGuestDetails={!isSignedOn}
          isAuthPending={isAuthPending}
          requiresApproval={Boolean(details?.requiresBookingApproval)}
          paymentMethodOptions={paymentMethodOptions}
          paymentInfo={details?.paymentInfo}
          isBooking={isBooking}
          created={created}
          onClose={handleCloseConfirm}
          onSubmit={handleSubmitBooking}
        />
      )}
    </>
  )
}
