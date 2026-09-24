import { getFormatter } from 'next-intl/server'
import { cn } from '@helpers/cn'
import { CalendarIcon, ClockIcon } from '@components/ui/icons'

// The mock is anchored to UTC so the grid, the weekday headers and the formatted
// labels all agree regardless of where the server runs.
const TIME_ZONE = 'UTC'
const DAYS_PER_WEEK = 7
const SELECTED_DAY_OFFSET = 2

const SLOTS = [
  { hour: 9, minute: 0, state: 'open' },
  { hour: 10, minute: 30, state: 'taken' },
  { hour: 12, minute: 0, state: 'open' },
  { hour: 14, minute: 30, state: 'selected' },
  { hour: 16, minute: 0, state: 'open' },
  { hour: 17, minute: 30, state: 'open' },
] as const

type Cell = { date: Date; inMonth: boolean }

const utcDate = (year: number, month: number, day: number, hour = 0, minute = 0): Date =>
  new Date(Date.UTC(year, month, day, hour, minute))

/** Monday-first weeks covering the whole month, padded with neighbouring days. */
const monthCells = (year: number, month: number): Cell[] => {
  const first = utcDate(year, month, 1)
  const lead = (first.getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
  const daysInMonth = utcDate(year, month + 1, 0).getUTCDate()
  const total = Math.ceil((lead + daysInMonth) / DAYS_PER_WEEK) * DAYS_PER_WEEK

  return Array.from({ length: total }, (_, index) => {
    const date = utcDate(year, month, index - lead + 1)
    return { date, inMonth: date.getUTCMonth() === month }
  })
}

/**
 * Decorative booking calendar for the landing hero. Not a live calendar — it has
 * to paint on the server, and the real FullCalendar is a client island. Every label
 * goes through the Intl formatter, so it reads in the visitor's language without
 * catalogue strings of its own.
 */
export const HomeHeroPreview = async () => {
  const format = await getFormatter()

  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const today = now.getUTCDate()
  const lastDay = utcDate(year, month + 1, 0).getUTCDate()
  const selectedDay = Math.min(today + SELECTED_DAY_OFFSET, lastDay)

  const cells = monthCells(year, month)
  const selectedSlot = SLOTS.find((slot) => slot.state === 'selected')!
  const selectedAt = utcDate(year, month, selectedDay, selectedSlot.hour, selectedSlot.minute)

  const time = (date: Date): string => format.dateTime(date, { hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE })

  return (
    <div className='bg-brand-50 w-full rounded-4xl p-6 sm:p-8' aria-hidden='true'>
      <div className='border-brand-border bg-surface flex flex-col gap-5 rounded-2xl border p-5 shadow-xl sm:p-6'>
        <div className='flex items-center justify-between gap-3'>
          <span className='text-body font-bold capitalize'>
            {format.dateTime(now, { month: 'long', year: 'numeric', timeZone: TIME_ZONE })}
          </span>
          <span className='bg-brand-50 text-brand flex size-8 items-center justify-center rounded-full'>
            <CalendarIcon className='h-4 w-4' />
          </span>
        </div>

        <div className='grid grid-cols-7 gap-1 text-center'>
          {cells.slice(0, DAYS_PER_WEEK).map(({ date }) => (
            <span key={`head-${date.toISOString()}`} className='text-overline text-brand-muted pb-1'>
              {format.dateTime(date, { weekday: 'narrow', timeZone: TIME_ZONE })}
            </span>
          ))}
          {cells.map(({ date, inMonth }) => {
            const day = date.getUTCDate()
            const weekday = date.getUTCDay()
            const isSelected = inMonth && day === selectedDay
            const isPast = !inMonth || day < today
            const isAvailable = inMonth && !isPast && weekday !== 0

            return (
              <span
                key={date.toISOString()}
                className={cn(
                  'text-body-sm tnum relative flex aspect-square items-center justify-center',
                  isSelected && 'bg-brand font-bold text-white shadow-md',
                  !isSelected && isPast && 'text-brand-muted opacity-40',
                  !isSelected && !isPast && 'font-semibold',
                  inMonth && day === today && !isSelected && 'ring-brand-300 ring-1'
                )}
              >
                {format.dateTime(date, { day: 'numeric', timeZone: TIME_ZONE })}
                {isAvailable && !isSelected && (
                  <span className='bg-brand-success absolute bottom-1 size-1 rounded-full' />
                )}
              </span>
            )
          })}
        </div>

        <div className='border-brand-border flex flex-col gap-3 border-t pt-4'>
          <span className='text-brand-muted text-body-sm flex items-center gap-2 font-semibold'>
            <ClockIcon className='h-4 w-4' />
            {format.dateTime(selectedAt, { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE })}
          </span>
          <div className='grid grid-cols-3 gap-2'>
            {SLOTS.map((slot) => (
              <span
                key={`${slot.hour}:${slot.minute}`}
                className={cn(
                  'text-body-sm tnum border py-2 text-center font-semibold',
                  slot.state === 'selected' && 'bg-brand border-brand text-white',
                  slot.state === 'open' && 'border-brand-border text-brand',
                  slot.state === 'taken' && 'bg-surface-sunken text-brand-muted border-transparent line-through'
                )}
              >
                {time(utcDate(year, month, selectedDay, slot.hour, slot.minute))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
