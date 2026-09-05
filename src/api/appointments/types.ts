import { BasicProvider } from '@store/providers/list/types'
import { ProviderProfile } from '@store/providers/profile/types'

export type CreateAppointmentPayload = {
  providerId: ProviderProfile['id']
  serviceId: string
  startAt: string
  notes?: string
}

export type AppointmentResponse = {
  id: string
  providerId: string
  serviceId: string
  consumerId: string
  time: {
    startDate: string
    endDate: string
    duration: number
  }
  status: string
  notes?: string
  createdAt?: string
  updatedAt?: string
  provider?: BasicProvider
  service?: { id: string; name: string }
  consumer?: {
    id: string
    basic: { firstName: string; lastName: string }
  }
}
