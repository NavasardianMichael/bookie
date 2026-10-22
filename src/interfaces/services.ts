import { ProviderService } from '@store/providers/profile/types'
import { WeekDay } from '@interfaces/schedule'
import { SERVICE_AVAILABILITY_MODES, SERVICE_RECURRENCES } from '@constants/serviceAvailability'

export type ServiceAvailabilityMode = (typeof SERVICE_AVAILABILITY_MODES)[keyof typeof SERVICE_AVAILABILITY_MODES]

export type ServiceRecurrence = (typeof SERVICE_RECURRENCES)[keyof typeof SERVICE_RECURRENCES]

/**
 * The availability section as the form holds it: every mode's choice at once, so switching
 * modes keeps what was picked. Only the active one is sent (`toServiceAvailability`).
 */
export type ServiceAvailabilityFormValues = {
  mode: ServiceAvailabilityMode
  recurrence: ServiceRecurrence
  weekdays: WeekDay[]
  monthDays: number[]
  /** `YYYY-MM-DD` on the provider's calendar. */
  dates: string[]
}

export type ProviderServiceFormValues = {
  /** Present only for a service that already exists — it is what picks POST vs PUT. */
  id?: ProviderService['id']
  name: ProviderService['name']
  duration?: ProviderService['duration']
  description?: ProviderService['description']
  price?: ProviderService['price']
  currency?: ProviderService['currency']
  /** A `File` between the crop and the save, the stored path once the API has it. */
  image?: ProviderService['image'] | File
  availability: ServiceAvailabilityFormValues
}
