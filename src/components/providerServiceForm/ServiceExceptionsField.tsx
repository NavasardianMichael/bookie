'use client'

import { FC } from 'react'
import { ServiceException, SpecialDate } from '@store/providers/profile/types'
import { TimeFormat } from '@interfaces/schedule'
import { rangesToDaySchedule, splitScheduleIntoParts } from '@helpers/schedule'
import { SpecialDatesEditor } from '@components/settings/SpecialDatesEditor'

type Props = {
  timeFormat: TimeFormat
  /** The provider's zone — "today", and so what counts as past, is theirs. */
  timeZone?: string
  /** Injected by the wrapping `Form.Item`. */
  value?: ServiceException[]
  onChange?: (next: ServiceException[]) => void
  disabled?: boolean
}

/** A service's windows as the dates editor holds a day's hours (availability + breaks). */
const toSpecialDate = (entry: ServiceException): SpecialDate => ({
  from: entry.from,
  to: entry.to,
  kind: entry.kind,
  hours: entry.hours?.length ? rangesToDaySchedule(entry.hours) : null,
  ...(entry.note ? { note: entry.note } : {}),
})

const toServiceException = (entry: SpecialDate): ServiceException => ({
  from: entry.from,
  to: entry.to,
  kind: entry.kind,
  ...(entry.hours ? { hours: splitScheduleIntoParts(entry.hours) } : {}),
  ...(entry.note ? { note: entry.note } : {}),
})

/**
 * A service's own dates on top of its rule, in two sections of the Availability tab's editor:
 *
 * - **Added dates** — offered on a day the rule leaves out, or at other hours on a day it covers
 *   (under "Specific days", a date's own hours);
 * - **Excluded dates** — not offered that day, or not during some hours of it.
 *
 * Either is cut to the provider's hours like the rest of the service. One list
 * (`availability.exceptions`) that never overlaps, converted to and from the editor's shape here.
 * A control-contract field (`forms` skill): the wrapping `Form.Item` owns the value.
 */
export const ServiceExceptionsField: FC<Props> = ({ timeFormat, timeZone, value = [], onChange, disabled }) => {
  const shared = {
    value: value.map(toSpecialDate),
    onChange: (next: SpecialDate[]) => onChange?.(next.map(toServiceException)),
    timeFormat,
    timeZone,
    disabled,
    nested: true,
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='border-brand-border rounded-brand border p-4'>
        <SpecialDatesEditor section='serviceAdded' {...shared} />
      </div>
      <div className='border-brand-border rounded-brand border p-4'>
        <SpecialDatesEditor section='serviceExcluded' {...shared} />
      </div>
    </div>
  )
}
