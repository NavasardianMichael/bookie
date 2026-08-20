'use client'

import { useCallback, useMemo, useState } from 'react'
import FullCalendar, { CalendarOptions, EventClickInfo, EventInput } from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import listPlugin from '@fullcalendar/react/list'
import classicThemePlugin from '@fullcalendar/react/themes/classic'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import dayjs from 'dayjs'
import { createAppointmentAPI } from '@api/appointments/main'
import { useSingleProviderStore } from '@store/providers/single/store'
import { processError } from '@helpers/error'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/palette.css'
import '@fullcalendar/react/themes/classic/theme.css'

const ProviderCalendar = () => {
  const providerStore = useSingleProviderStore()
  const { basic: basicProvider, id: providerId, services } = providerStore
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [bookingMessage, setBookingMessage] = useState<string | null>(null)

  const generateTimeSlots = (date: Date) => {
    const slots: EventInput[] = []
    const startHour = 9
    const endHour = 17

    for (let hour = startHour; hour <= endHour; hour++) {
      for (const minute of [0, 30]) {
        const slotDate = dayjs(date).hour(hour).minute(minute).toDate()
        if (slotDate > new Date()) {
          slots.push({
            title: 'Available',
            start: slotDate,
            end: dayjs(slotDate).add(30, 'minutes').toDate(),
            display: 'block',
            backgroundColor: '#18294D',
            classNames: ['available-slot'],
          })
        }
      }
    }
    return slots
  }

  const defaultServiceId = useMemo(() => {
    const firstId = services.allIds[0]
    return firstId ? services.byId[firstId]?.id : undefined
  }, [services.allIds, services.byId])

  const handleDateClick = (arg: { date: Date; allDay: boolean }) => {
    if (arg.allDay) return
    setSelectedDate(arg.date)
    setBookingMessage(null)
  }

  const handleEventClick = useCallback(
    async (arg: EventClickInfo) => {
      const event = arg.event
      if (!event.start || !providerId || !defaultServiceId) {
        setBookingMessage('Select a service before booking.')
        return
      }

      try {
        await createAppointmentAPI({
          providerId,
          serviceId: defaultServiceId,
          startAt: event.start.toISOString(),
        })
        setBookingMessage('Appointment requested. Sign in as a consumer if booking failed.')
      } catch (err) {
        setBookingMessage(processError(err).message)
      }
    },
    [defaultServiceId, providerId]
  )

  const headerToolbar: CalendarOptions['headerToolbar'] = useMemo(() => {
    return {
      left: 'prev',
      center: 'today',
      right: 'next',
    }
  }, [])

  return (
    <div className='h-[800px] flex flex-col gap-2'>
      {bookingMessage ? <p className='text-sm text-center'>{bookingMessage}</p> : null}
      <div className='grow min-h-0'>
        <FullCalendar
          plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView='timeGridDay'
          headerToolbar={headerToolbar}
          events={selectedDate ? generateTimeSlots(selectedDate) : []}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          slotMinTime='00:00:00'
          slotMaxTime='24:00:00'
          locale={'hy-am'}
          allDaySlot={false}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          noEventsText={`${basicProvider.firstName} ${basicProvider.lastName} has no any registered slots for now.`}
          nowIndicator={true}
          height='100%'
          slotDuration='00:30:00'
          tableHeaderSticky={true}
          validRange={{
            start: new Date(),
          }}
        />
      </div>
    </div>
  )
}

export default ProviderCalendar
