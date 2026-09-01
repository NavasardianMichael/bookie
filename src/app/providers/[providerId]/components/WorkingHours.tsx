import { FC } from 'react'
import { WeekSchedule } from '@store/providers/profile/types'
import { WEEK_DAYS_LIST } from '@constants/schedule'
import { hasWeekScheduleHours, splitScheduleIntoParts } from '@helpers/schedule'
import AppDescriptionList, { AppDescriptionListItem } from '@components/ui/bare/AppDescriptionList'
import AppText from '@components/ui/bare/AppText'
import AppTime from '@components/ui/bare/AppTime'

type Props = {
  weekSchedule: WeekSchedule
  columns?: 1 | 2
}

/**
 * Opening hours as a `<dl>`, from the same `splitScheduleIntoParts` the calendar
 * uses — so a day with a lunch break reads as two ranges here exactly as it does
 * in the slot grid, rather than overstating availability.
 *
 * Server-rendered on purpose: the schedule reached the page as a prop but was only
 * ever consumed inside the client calendar, so "when is this provider open" — one
 * of the two questions every local-business search asks — was absent from the
 * markup entirely.
 */
const WorkingHours: FC<Props> = ({ weekSchedule, columns = 1 }) => {
  if (!hasWeekScheduleHours(weekSchedule)) return null

  const items: AppDescriptionListItem[] = WEEK_DAYS_LIST.map((day) => {
    const parts = splitScheduleIntoParts(weekSchedule[day])

    return {
      key: day,
      label: <span className='capitalize'>{day}</span>,
      value: parts.length ? (
        <span className='flex flex-col'>
          {parts.map((part) => (
            <span key={`${part.start}-${part.end}`}>
              <AppTime dateTime={part.start}>{part.start}</AppTime>
              {' – '}
              <AppTime dateTime={part.end}>{part.end}</AppTime>
            </span>
          ))}
        </span>
      ) : (
        <AppText tone='muted'>Closed</AppText>
      ),
    }
  })

  return <AppDescriptionList items={items} columns={columns} />
}

export default WorkingHours
