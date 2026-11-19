import dayjs from 'dayjs'
import { ClearableField, ProviderServiceRequestPayload } from '@api/providers/types'
import { DaySchedulePart, ServiceAvailability } from '@store/providers/profile/types'
import { ScheduleRangeForm, WeekDay } from '@interfaces/schedule'
import { ProviderServiceFormValues, ServiceAvailabilityFormValues } from '@interfaces/services'
import { SCHEDULE_VALUE_FORMAT, WEEK_DAYS_LIST } from '@constants/schedule'
import { SERVICE_AVAILABILITY_MODES, SERVICE_RECURRENCES } from '@constants/serviceAvailability'
import { SERVICE_AVAILABILITY_FORM_INITIAL_VALUES } from '@constants/services'
import { defaultScheduleRange } from '@helpers/schedule'

/**
 * Empty is sent as `''`, never dropped.
 *
 * The old builder gated every field behind `if (formValues.x)`, so an emptied
 * description, price or currency was simply left out of the payload — and the API reads
 * an absent field as "leave this column alone". Clearing one could never be saved.
 * `null` is folded in here too: antd's `InputNumber` yields it on clear.
 */
const orCleared = <T>(value: T | null | undefined): ClearableField<T> => (value === null || value === undefined ? '' : value)

const toRangeForms = (parts: readonly DaySchedulePart[]): ScheduleRangeForm[] =>
  parts.map((part) => ({ start: dayjs(part.start, SCHEDULE_VALUE_FORMAT), end: dayjs(part.end, SCHEDULE_VALUE_FORMAT) }))

/** Complete, forward ranges as the API stores them; `undefined` when none is. */
const toParts = (ranges: readonly ScheduleRangeForm[] | undefined): DaySchedulePart[] | undefined => {
  const parts = (ranges ?? [])
    .filter((range) => range.start && range.end)
    .map((range) => ({ start: range.start!.format(SCHEDULE_VALUE_FORMAT), end: range.end!.format(SCHEDULE_VALUE_FORMAT) }))
    .filter((range) => range.start < range.end)
  return parts.length ? parts : undefined
}

/**
 * A stored rule as the form's section holds it. Weekdays a rule never named start as the
 * provider's open ones, so switching an "always" service to Weekdays begins from the same
 * days and the provider unticks what they do not want. Dates already gone are dropped.
 *
 * Every hours field holds a window even while unused — the shared set, and each weekday's
 * (its own, else the shared set) — so switching one on shows hours to edit.
 */
export const toServiceAvailabilityFormValues = (
  availability: ServiceAvailability | undefined,
  openWeekdays: WeekDay[],
  todayKey: string
): ServiceAvailabilityFormValues => {
  const own = availability?.hours ?? []
  const byDay = availability?.mode === 'weekdays' ? (availability.hoursByDay ?? {}) : {}
  const shared = own.length ? toRangeForms(own) : [defaultScheduleRange()]
  const base: ServiceAvailabilityFormValues = {
    ...SERVICE_AVAILABILITY_FORM_INITIAL_VALUES,
    weekdays: openWeekdays,
    limitHours: own.length > 0 || Object.keys(byDay).length > 0,
    perDayHours: Object.keys(byDay).length > 0,
    hours: shared,
    hoursByDay: Object.fromEntries(
      WEEK_DAYS_LIST.map((day) => [day, byDay[day]?.length ? toRangeForms(byDay[day]!) : shared])
    ) as Record<WeekDay, ScheduleRangeForm[]>,
    exceptions: (availability?.exceptions ?? []).filter((entry) => entry.to >= todayKey),
  }
  switch (availability?.mode) {
    case 'weekdays':
      return {
        ...base,
        mode: SERVICE_AVAILABILITY_MODES.recurring,
        recurrence: SERVICE_RECURRENCES.weekdays,
        weekdays: availability.days,
      }
    case 'monthDays':
      return {
        ...base,
        mode: SERVICE_AVAILABILITY_MODES.recurring,
        recurrence: SERVICE_RECURRENCES.monthDays,
        monthDays: { days: availability.days, ...(availability.lastDay ? { lastDay: true } : {}) },
      }
    case 'dates':
      return {
        ...base,
        mode: SERVICE_AVAILABILITY_MODES.dates,
        dates: availability.dates.filter((date) => date >= todayKey),
      }
    default:
      return base
  }
}

/**
 * The section's own hours as the API stores them: none while the switch is off; each ticked
 * weekday's own under a weekday rule split by day; otherwise the one shared set.
 */
const toServiceHours = (
  values: Partial<ServiceAvailabilityFormValues> | undefined,
  days: ServiceAvailability
): Pick<ServiceAvailability, 'hours' | 'hoursByDay'> => {
  if (!values?.limitHours) return {}
  if (days.mode === 'weekdays' && values.perDayHours) {
    const hoursByDay = Object.fromEntries(
      days.days.flatMap((day) => {
        const parts = toParts(values.hoursByDay?.[day])
        return parts ? [[day, parts]] : []
      })
    )
    return Object.keys(hoursByDay).length ? { hoursByDay } : {}
  }
  const hours = toParts(values.hours)
  return hours ? { hours } : {}
}

/** The days a service is offered on, without its hours. Fields of an unmounted mode may be absent. */
const toServiceDays = (values: Partial<ServiceAvailabilityFormValues> | undefined): ServiceAvailability => {
  if (values?.mode === SERVICE_AVAILABILITY_MODES.dates) return { mode: 'dates', dates: [...(values.dates ?? [])].sort() }
  if (values?.mode !== SERVICE_AVAILABILITY_MODES.recurring) return { mode: 'always' }
  if (values.recurrence === SERVICE_RECURRENCES.monthDays) {
    return {
      mode: 'monthDays',
      days: [...(values.monthDays?.days ?? [])].sort((a, b) => a - b),
      ...(values.monthDays?.lastDay ? { lastDay: true } : {}),
    }
  }
  return { mode: 'weekdays', days: values.weekdays ?? [] }
}

/** The section's active choice as the API stores it, with its hours and its added and excluded dates. */
export const toServiceAvailability = (values: Partial<ServiceAvailabilityFormValues> | undefined): ServiceAvailability => {
  const days = toServiceDays(values)
  const exceptions = values?.exceptions ?? []
  return { ...days, ...toServiceHours(values, days), ...(exceptions.length ? { exceptions } : {}) }
}

export const processProviderServiceFormToRequestPayload = (
  formValues: ProviderServiceFormValues
): ProviderServiceRequestPayload => ({
  name: formValues.name,
  duration: formValues.duration,
  description: orCleared(formValues.description),
  price: orCleared(formValues.price),
  currency: orCleared(formValues.currency),
  // Left as-is: the API layer drops it unless it is a freshly cropped `File`.
  image: formValues.image,
  availability: toServiceAvailability(formValues.availability),
})
