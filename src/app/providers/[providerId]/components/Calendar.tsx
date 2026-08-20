'use client'

import { useCallback, useMemo, useState } from 'react'
import FullCalendar, { CalendarOptions, EventClickInfo, EventInput } from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import classicThemePlugin from '@fullcalendar/react/themes/classic'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import { App, Grid, Segmented, Select } from 'antd'
import { createAppointmentAPI } from '@api/appointments/main'
import { useSingleProviderStore } from '@store/providers/single/store'
import { getSlotsForDate, getVisibleTimeRange } from '@helpers/booking'
import { processError } from '@helpers/error'
import '@styles/full-calendar-override.css'
import { BRAND } from '@styles/tokens'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/palette.css'
import '@fullcalendar/react/themes/classic/theme.css'

const DEFAULT_DURATION_MINUTES = 30

const ProviderCalendar = () => {
  const { basic: basicProvider, details, id: providerId, services } = useSingleProviderStore()
  const { notification } = App.useApp()
  const screens = Grid.useBreakpoint()

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
  // Defaults to today: events used to be gated on a dateClick, so a visitor saw
  // zero slots until they happened to tap an empty cell.
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [isBooking, setIsBooking] = useState(false)

  const durationMinutes = useMemo(() => {
    const service = selectedServiceId ? services.byId[selectedServiceId] : undefined
    return service?.duration || DEFAULT_DURATION_MINUTES
  }, [selectedServiceId, services.byId])

  const visibleRange = useMemo(() => getVisibleTimeRange(details?.weekSchedule), [details?.weekSchedule])

  const events: EventInput[] = useMemo(
    () =>
      getSlotsForDate({ weekSchedule: details?.weekSchedule, date: selectedDate, durationMinutes }).map((slot) => ({
        title: 'Available',
        start: slot.start,
        end: slot.end,
        display: 'block',
        // A solid fill reads as "busy" in calendar convention, so available slots
        // are a light tint and only the border carries the brand colour.
        backgroundColor: BRAND[50],
        borderColor: BRAND[300],
        textColor: BRAND[900],
        classNames: ['available-slot'],
      })),
    [details?.weekSchedule, selectedDate, durationMinutes]
  )

  const handleDateClick = useCallback((arg: { date: Date; allDay: boolean }) => {
    setSelectedDate(arg.date)
  }, [])

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
    [basicProvider.firstName, basicProvider.lastName, notification, providerId, selectedServiceId]
  )

  const headerToolbar: CalendarOptions['headerToolbar'] = useMemo(
    () => ({ left: 'prev', center: 'today', right: 'next' }),
    []
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

      {/* Fluid height with `expandRows`, replacing a fixed 800px box that held
          1920px of grid and turned the calendar into its own scroll container. */}
      <div className='min-h-[26rem]'>
        <FullCalendar
          plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView='timeGridDay'
          headerToolbar={headerToolbar}
          events={events}
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
