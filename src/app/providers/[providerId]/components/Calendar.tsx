'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import FullCalendar, {
  CalendarOptions,
  CalendarRef,
  DateClickInfo,
  DatesSetInfo,
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
import { getSlotsForDateRange, getVisibleTimeRange } from '@helpers/booking'
import { processError } from '@helpers/error'
import '@styles/full-calendar-override.css'
import { BRAND } from '@styles/tokens'
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

const isCalendarView = (value: string): value is CalendarView =>
  CALENDAR_VIEWS.some((view) => view.value === value)

const slotEventStyle = {
  backgroundColor: BRAND[50],
  borderColor: BRAND[300],
  textColor: BRAND[900],
  classNames: ['available-slot'],
} satisfies Partial<EventInput>

const ProviderCalendar = () => {
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
  const [isBooking, setIsBooking] = useState(false)

  const durationMinutes = useMemo(() => {
    const service = selectedServiceId ? services.byId[selectedServiceId] : undefined
    return service?.duration || DEFAULT_DURATION_MINUTES
  }, [selectedServiceId, services.byId])

  const visibleRange = useMemo(() => getVisibleTimeRange(details?.weekSchedule), [details?.weekSchedule])

  const events: EventInput[] = useMemo(() => {
    const slots = getSlotsForDateRange({
      weekSchedule: details?.weekSchedule,
      start: visibleDates.start,
      end: visibleDates.end,
      durationMinutes,
    })

    if (currentView === 'dayGridMonth') {
      const countByDay = new Map<string, number>()
      slots.forEach((slot) => {
        const key = dayjs(slot.start).format('YYYY-MM-DD')
        countByDay.set(key, (countByDay.get(key) ?? 0) + 1)
      })

      return [...countByDay.entries()].map(([day, count]) => ({
        title: count === 1 ? '1 slot' : `${count} slots`,
        start: day,
        allDay: true,
        display: 'block',
        ...slotEventStyle,
      }))
    }

    return slots.map((slot) => ({
      title: 'Available',
      start: slot.start,
      end: slot.end,
      display: 'block',
      ...slotEventStyle,
    }))
  }, [currentView, details?.weekSchedule, durationMinutes, visibleDates.end, visibleDates.start])

  const goToDayView = useCallback((date: Date) => {
    calendarRef.current?.getApi().changeView('timeGridDay', date)
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
      if (arg.view.type === 'dayGridMonth') goToDayView(arg.date)
    },
    [goToDayView]
  )

  const handleEventClick = useCallback(
    async (arg: EventClickInfo) => {
      const start = arg.event.start
      if (!start || !providerId) return

      if (!selectedServiceId) {
        notification.warning({
          message: 'Choose a service',
          description: 'Select which service you want to book before picking a slot.',
        })
        return
      }

      if (arg.event.allDay) {
        goToDayView(start)
        return
      }

      setIsBooking(true)
      try {
        await createAppointmentAPI({
          providerId,
          serviceId: selectedServiceId,
          startAt: start.toISOString(),
        })
        notification.success({
          message: 'Appointment requested',
          description: `${basicProvider.firstName} ${basicProvider.lastName} will confirm your booking shortly.`,
        })
      } catch (err) {
        notification.error({ message: 'Booking failed', description: processError(err).message })
      } finally {
        setIsBooking(false)
      }
    },
    [basicProvider.firstName, basicProvider.lastName, goToDayView, notification, providerId, selectedServiceId]
  )

  const headerToolbar: CalendarOptions['headerToolbar'] = useMemo(
    () => ({ left: 'prev,next', center: 'title', right: 'today' }),
    []
  )

  const viewSwitcher = screens.sm ? (
    <Segmented block options={[...CALENDAR_VIEWS]} value={currentView} onChange={handleViewChange} />
  ) : (
    <Select
      size='large'
      className='w-full'
      options={[...CALENDAR_VIEWS]}
      value={currentView}
      onChange={handleViewChange}
    />
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
            size='large'
            className='w-full'
            placeholder='Select a service'
            options={serviceOptions}
            value={selectedServiceId}
            onChange={setSelectedServiceId}
          />
        ))}

      {viewSwitcher}

      {/* Fluid height with `expandRows`, replacing a fixed 800px box that held
          1920px of grid and turned the calendar into its own scroll container. */}
      <div className='min-h-[26rem]'>
        <FullCalendar
          ref={calendarRef}
          plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView='dayGridMonth'
          headerToolbar={headerToolbar}
          events={events}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          slotMinTime={visibleRange.min}
          slotMaxTime={visibleRange.max}
          slotDuration={screens.md ? '00:30:00' : '01:00:00'}
          allDaySlot={false}
          selectable
          selectMirror
          dayMaxEvents
          weekends
          noEventsText={`${basicProvider.firstName} ${basicProvider.lastName} has no available slots for this day.`}
          nowIndicator
          height='auto'
          expandRows
          validRange={{ start: new Date() }}
        />
      </div>

      {isBooking && <p className='text-caption text-center'>Requesting your appointment…</p>}
    </div>
  )
}

export default ProviderCalendar
