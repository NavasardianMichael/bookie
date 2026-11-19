import { ProviderServiceFormValues, ServiceAvailabilityFormValues } from '@interfaces/services'
import { SERVICE_AVAILABILITY_MODES, SERVICE_RECURRENCES } from '@constants/serviceAvailability'

export const SERVICE_AVAILABILITY_FORM_INITIAL_VALUES: ServiceAvailabilityFormValues = {
  mode: SERVICE_AVAILABILITY_MODES.always,
  recurrence: SERVICE_RECURRENCES.weekdays,
  weekdays: [],
  monthDays: { days: [] },
  shortLast: false,
  dates: [],
  limitHours: false,
  perDayHours: false,
  hours: [],
  hoursByDay: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
  exceptions: [],
}

export const PROVIDER_PROFILE_SERVICE_FORM_INITIAL_VALUES: ProviderServiceFormValues = {
  id: undefined,
  name: '',
  duration: undefined,
  description: undefined,
  price: undefined,
  currency: undefined,
  image: undefined,
  availability: SERVICE_AVAILABILITY_FORM_INITIAL_VALUES,
}
