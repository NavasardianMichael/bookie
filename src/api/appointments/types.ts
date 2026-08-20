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
}
