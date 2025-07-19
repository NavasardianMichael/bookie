import { Consumer } from '@store/consumers/profile/types'
import { Organization } from '@store/organizations/single/types'
import { Provider, ProviderServices } from '@store/providers/profile/types'

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'

export type AppointmentTime = {
  startDate: string // ISO date string
  endDate: string // ISO date string
  duration: number // in minutes
}

export type Appointment = {
  id: string
  consumerId: Consumer['id']
  providerId: Provider['id']
  serviceId: ProviderServices['id']
  organizationId?: Organization['id']
  time: AppointmentTime
  status: AppointmentStatus
  notes?: string
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
}

export type BasicAppointment = Pick<Appointment, 'id' | 'time' | 'status'>

export type AppointmentWithDetails = Appointment & {
  consumer: Pick<Consumer, 'id' | 'basic'>
  provider: Pick<Provider, 'id' | 'basic'>
  service: ProviderServices
  organization?: Pick<Organization, 'id' | 'basic'>
}
