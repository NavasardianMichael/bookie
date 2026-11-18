import dayjs from 'dayjs'
import { ClearableField, ProviderServiceRequestPayload } from '@api/providers/types'
import { ServiceAvailability } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { ProviderServiceFormValues, ServiceAvailabilityFormValues } from '@interfaces/services'
import { SCHEDULE_VALUE_FORMAT } from '@constants/schedule'
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

/**
 * A stored rule as the form's section holds it. Weekdays a rule never named start as the
 * provider's open ones, so switching an "always" service to Weekdays begins from the same
 * days and the provider unticks what they do not want. Dates already gone are dropped.
 */
export const toServiceAvailabilityFormValues = (
  availability: ServiceAvailability | undefined,
  openWeekdays: WeekDay[],
  todayKey: string
): ServiceAvailabilityFormValues => {
  const own = availability?.hours ?? []
  const base = {
    ...SERVICE_AVAILABILITY_FORM_INITIAL_VALUES,
    weekdays: openWeekdays,
    limitHours: own.length > 0,
    // A switched-off section still holds one window, so switching it on shows hours to edit.
    hours: own.length
      ? own.map((part) => ({ start: dayjs(part.start, SCHEDULE_VALUE_FORMAT), end: dayjs(part.end, SCHEDULE_VALUE_FORMAT) }))
      : [defaultScheduleRange()],
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
        monthDays: availability.days,
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

/** The section's own hours as the API stores them, or none when the switch is off. */
const toServiceHours = (values: Partial<ServiceAvailabilityFormValues> | undefined): ServiceAvailability['hours'] => {
  if (!values?.limitHours) return undefined
  const hours = (values.hours ?? [])
    .filter((range) => range.start && range.end)
    .map((range) => ({ start: range.start!.format(SCHEDULE_VALUE_FORMAT), end: range.end!.format(SCHEDULE_VALUE_FORMAT) }))
    .filter((range) => range.start < range.end)
  return hours.length ? hours : undefined
}

/** The days a service is offered on, without its hours. Fields of an unmounted mode may be absent. */
const toServiceDays = (values: Partial<ServiceAvailabilityFormValues> | undefined): ServiceAvailability => {
  if (values?.mode === SERVICE_AVAILABILITY_MODES.dates) return { mode: 'dates', dates: [...(values.dates ?? [])].sort() }
  if (values?.mode !== SERVICE_AVAILABILITY_MODES.recurring) return { mode: 'always' }
  if (values.recurrence === SERVICE_RECURRENCES.monthDays) {
    return { mode: 'monthDays', days: [...(values.monthDays ?? [])].sort((a, b) => a - b) }
  }
  return { mode: 'weekdays', days: values.weekdays ?? [] }
}

/** The section's active choice as the API stores it. */
export const toServiceAvailability = (values: Partial<ServiceAvailabilityFormValues> | undefined): ServiceAvailability => {
  const hours = toServiceHours(values)
  return hours ? { ...toServiceDays(values), hours } : toServiceDays(values)
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
