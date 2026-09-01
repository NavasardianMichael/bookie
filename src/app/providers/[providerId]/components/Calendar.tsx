'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import FullCalendar, {
  CalendarOptions,
  CalendarRef,
  DateClickInfo,
  DatesSetInfo,
  DayCellInfo,
  EventClickInfo,
  EventInput,
} from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import classicThemePlugin from '@fullcalendar/react/themes/classic'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import { App, Grid, Segmented, Select } from 'antd'
import dayjs from 'dayjs'
import { createAppointmentAPI } from '@api/appointments/main'
import { useSingleProviderStore } from '@store/providers/single/store'
import { DAY_KEY_FORMAT } from '@constants/schedule'
import { countSlotsByDay, getSlotsForDate, getSlotsForDateRange, getVisibleTimeRange } from '@helpers/booking'
import { processError } from '@helpers/error'
import '@styles/full-calendar-override.css'
import { BRAND } from '@styles/tokens'
import { SlotPicker } from './SlotPicker'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/palette.css'
import '@fullcalendar/react/themes/classic/theme.css'

const DEFAULT_DURATION_MINUTES = 30

const CALENDAR_VIEWS = [
  { value: 'dayGridMonth', label: 'Month' },
  { value: 'timeGridWeek', label: 'Week' },
  { value: 'timeGridDay', label: 'Day' },
] as const

type CalendarView = (typeof CALENDAR_VIEWS)[number]['value']

const isCalendarView = (value: string): value is CalendarView => CALENDAR_VIEWS.some((view) => view.value === value)

/**
 * v7 renamed the per-event UI keys to `color`/`contrastColor`/`className`. The v6
 * `backgroundColor`/`textColor`/`classNames` still type-check through EventInput's
 * index signature but are dropped at runtime, which left every available slot in
 * the theme's default blue and the `available-slot` hook unattached.
 */
const slotEventStyle = {
  color: BRAND[50],
  contrastColor: BRAND[900],
  className: 'available-slot',
} satisfies Partial<EventInput>

type PickerState = {
  open: boolean
  date: Date | null
  /** ISO start of the slot the visitor picked, or null while they are still choosing. */
  selectedStart: string | null
}

const CLOSED_PICKER: PickerState = { open: false, date: null, selectedStart: null }

export const ProviderCalendar = () => {
  const { basic: basicProvider, details, id: providerId, services } = useSingleProviderStore()
  const { notification } = App.useApp()
  const screens = Grid.useBreakpoint()
  const calendarRef = useRef<CalendarRef>(null)

  const serviceOptions = useMemo(
    () =>
      services.allIds.map((serviceId) => {
        const service = services.byId[serviceId]
        return {
          value: service.id,
          label: [service.name, service.duration ? `${service.duration} min` : null].filter(Boolean).join(' · '),
        }
      }),
    [services.allIds, services.byId]
  )

  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(() => services.allIds[0])
  const [currentView, setCurrentView] = useState<CalendarView>('dayGridMonth')
  const [visibleDates, setVisibleDates] = useState(() => {
    const start = dayjs().startOf('day')
    return { start: start.toDate(), end: start.add(1, 'day').toDate() }
  })
  const [picker, setPicker] = useState<PickerState>(CLOSED_PICKER)
  const [requestedStarts, setRequestedStarts] = useState<string[]>([])
  const [isBooking, setIsBooking] = useState(false)

  const durationMinutes = useMemo(() => {
    const service = selectedServiceId ? services.byId[selectedServiceId] : undefined
    return service?.duration || DEFAULT_DURATION_MINUTES
  }, [selectedServiceId, services.byId])

  const visibleRange = useMemo(() => getVisibleTimeRange(details?.weekSchedule), [details?.weekSchedule])

  const visibleSlots = useMemo(
    () =>
      getSlotsForDateRange({
        weekSchedule: details?.weekSchedule,
        start: visibleDates.start,
        end: visibleDates.end,
        durationMinutes,
      }),
    [details?.weekSchedule, durationMinutes, visibleDates.end, visibleDates.start]
  )

  const slotCountByDay = useMemo(() => countSlotsByDay(visibleSlots), [visibleSlots])

  const events: EventInput[] = useMemo(() => {
    if (currentView === 'dayGridMonth') {
      return [...slotCountByDay.entries()].map(([day, count]) => ({
        title: count === 1 ? '1 slot' : `${count} slots`,
        start: day,
        allDay: true,
        display: 'block',
        ...slotEventStyle,
      }))
    }

    return visibleSlots.map((slot) => ({
      title: 'Available',
      start: slot.start,
      end: slot.end,
      display: 'block',
      ...slotEventStyle,
    }))
  }, [currentView, slotCountByDay, visibleSlots])

  /**
   * Month-view days holding slots are the click target, so they have to read as
   * one. In the time-grid views the same cell is a column header, not a target.
   */
  const dayCellClass = useCallback(
    (info: DayCellInfo) =>
      info.view.type === 'dayGridMonth' && slotCountByDay.has(dayjs(info.date).format(DAY_KEY_FORMAT))
        ? 'bookable-day'
        : null,
    [slotCountByDay]
  )

  const pickerSlots = useMemo(
    () =>
      picker.date ? getSlotsForDate({ weekSchedule: details?.weekSchedule, date: picker.date, durationMinutes }) : [],
    [details?.weekSchedule, durationMinutes, picker.date]
  )

  /**
   * A service swapped behind the open sheet re-steps the day, so a pick made
   * before the swap can name a time that no longer exists.
   */
  const selectedStart = useMemo(
    () => (pickerSlots.some((slot) => slot.start.toISOString() === picker.selectedStart) ? picker.selectedStart : null),
    [picker.selectedStart, pickerSlots]
  )

  const openPicker = useCallback((date: Date, preselect?: Date) => {
    setPicker({ open: true, date, selectedStart: preselect?.toISOString() ?? null })
  }, [])

  const closePicker = useCallback(() => setPicker((prev) => ({ ...prev, open: false })), [])

  const handleSelectSlot = useCallback((startISO: string) => {
    setPicker((prev) => ({ ...prev, selectedStart: startISO }))
  }, [])

  const handleDatesSet = useCallback((info: DatesSetInfo) => {
    if (isCalendarView(info.view.type)) setCurrentView(info.view.type)
    setVisibleDates((prev) =>
      prev.start.getTime() === info.start.getTime() && prev.end.getTime() === info.end.getTime()
        ? prev
        : { start: info.start, end: info.end }
    )
  }, [])

  const handleViewChange = useCallback((value: string | number) => {
    if (typeof value === 'string' && isCalendarView(value)) {
      calendarRef.current?.getApi().changeView(value)
    }
  }, [])

  const handleDateClick = useCallback(
    (arg: DateClickInfo) => {
      if (arg.allDay) {
        openPicker(arg.date)
        return
      }

      // A time-grid cell click lands inside a slot as often as on its edge, so
      // preselect whichever slot covers the clicked minute.
      const slots = getSlotsForDate({ weekSchedule: details?.weekSchedule, date: arg.date, durationMinutes })
      const covering = slots.find((slot) => arg.date >= slot.start && arg.date < slot.end)
      openPicker(arg.date, covering?.start)
    },
    [details?.weekSchedule, durationMinutes, openPicker]
  )

  const handleEventClick = useCallback(
    (arg: EventClickInfo) => {
      const start = arg.event.start
      if (!start) return

      // The month view's event is a per-day count, not a slot.
      openPicker(start, arg.event.allDay ? undefined : start)
    },
    [openPicker]
  )

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedStart || !providerId) return

    if (!selectedServiceId) {
      notification.warning({
        message: 'Choose a service',
        description: 'Select which service you want to book before picking a slot.',
      })
      return
    }

    setIsBooking(true)
    try {
      await createAppointmentAPI({ providerId, serviceId: selectedServiceId, startAt: selectedStart })
      setRequestedStarts((prev) => [...prev, selectedStart])
      notification.success({
        message: 'Appointment requested',
        description: `${basicProvider.firstName} ${basicProvider.lastName} will confirm your ${dayjs(selectedStart).format('D MMMM, HH:mm')} booking shortly.`,
      })
      setPicker((prev) => ({ ...prev, open: false, selectedStart: null }))
    } catch (err) {
      notification.error({ message: 'Booking failed', description: processError(err).message })
    } finally {
      setIsBooking(false)
    }
  }, [basicProvider.firstName, basicProvider.lastName, notification, providerId, selectedServiceId, selectedStart])

  const headerToolbar: CalendarOptions['headerToolbar'] = useMemo(
    () => ({ left: 'prev,next', center: 'title', right: 'today' }),
    []
  )

  /** An inline `{ start: new Date() }` re-initialises the calendar on every render. */
  const validRange = useMemo(() => ({ start: new Date() }), [])

  const selectedService = selectedServiceId ? services.byId[selectedServiceId] : undefined

  const viewSwitcher = screens.sm ? (
    <Segmented block options={[...CALENDAR_VIEWS]} value={currentView} onChange={handleViewChange} />
  ) : (
    <Select className='w-full' options={[...CALENDAR_VIEWS]} value={currentView} onChange={handleViewChange} />
  )

  return (
    <div className='flex flex-col gap-4'>
      {serviceOptions.length > 1 &&
        (screens.sm ? (
          <Segmented
            block
            options={serviceOptions}
            value={selectedServiceId}
            onChange={(value) => setSelectedServiceId(value as string)}
          />
        ) : (
          <Select
            className='w-full'
            placeholder='Select a service'
            options={serviceOptions}
            value={selectedServiceId}
            onChange={setSelectedServiceId}
          />
        ))}

      {viewSwitcher}

      <p className='text-caption m-0'>Tap any day to see every open time and pick one.</p>

      {/* Fluid height with `expandRows`, replacing a fixed 800px box that held
          1920px of grid and turned the calendar into its own scroll container. */}
      <div className='min-h-[26rem]'>
        <FullCalendar
          ref={calendarRef}
          className='bookie-calendar'
          plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView='dayGridMonth'
          headerToolbar={headerToolbar}
          events={events}
          dayCellClass={dayCellClass}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          slotMinTime={visibleRange.min}
          slotMaxTime={visibleRange.max}
          slotDuration={screens.md ? '00:30:00' : '01:00:00'}
          allDaySlot={false}
          dayMaxEvents
          weekends
          noEventsText={`${basicProvider.firstName} ${basicProvider.lastName} has no available slots for this day.`}
          nowIndicator
          height='auto'
          expandRows
          validRange={validRange}
        />
      </div>

      <SlotPicker
        open={picker.open}
        date={picker.date}
        slots={pickerSlots}
        selectedStart={selectedStart}
        requestedStarts={requestedStarts}
        serviceLabel={selectedService?.name}
        isBooking={isBooking}
        onSelect={handleSelectSlot}
        onConfirm={handleConfirmBooking}
        onClose={closePicker}
      />
    </div>
  )
}
