'use client'

import { useState } from 'react'
import { EventClickArg, EventInput } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayjs from 'dayjs'
import { useProviderStore } from '@store/providers/single/store'

const ProviderCalendar = () => {
  const basicProvider = useProviderStore.use.basic()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Generate time slots for the selected date
  const generateTimeSlots = (date: Date) => {
    const slots: EventInput[] = []
    const startHour = 9
    const endHour = 17

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute of [0, 30]) {
        const slotDate = dayjs(date).hour(hour).minute(minute).toDate()
        if (slotDate > new Date()) {
          // Only add future time slots
          slots.push({
            title: 'Available',
            start: slotDate,
            end: dayjs(slotDate).add(30, 'minutes').toDate(),
            display: 'block',
            backgroundColor: '#4D869C',
            classNames: ['available-slot'],
          })
        }
      }
    }
    return slots
  }

  const handleDateClick = (arg: { date: Date; allDay: boolean }) => {
    if (arg.allDay) return // Ignore all-day selections
    setSelectedDate(arg.date)
  }

  const handleEventClick = (arg: EventClickArg) => {
    const event = arg.event
    console.log('Booking slot:', {
      date: event.start,
      end: event.end,
    })
  }

  return (
    <div className="h-[800px]">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridDay"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={selectedDate ? generateTimeSlots(selectedDate) : []}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        allDaySlot={false}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        noEventsText={`${basicProvider.firstName} ${basicProvider.lastName} has no any registered slots for now.`}
        nowIndicator={true}
        height="100%"
        slotDuration="00:30:00"
        stickyHeaderDates={true}
        validRange={{
          start: new Date(),
        }}
      />
    </div>
  )
}

export default ProviderCalendar
