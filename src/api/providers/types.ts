import { Category } from '@store/categories/single/types'
import { Organization } from '@store/organizations/single/types'
import { BasicProvider, ProvidersListState } from '@store/providers/list/types'
import { ProviderProfile, ProviderService } from '@store/providers/profile/types'
import { SingleProvider } from '@store/providers/single/types'
import { Endpoint } from '@interfaces/api'

export type ProviderServiceResponse = ProviderService

export type PutProviderProfileRequestPayload = Partial<{
  firstName: string
  lastName: string
  description: string
  email: string
  address: string
  locationURL: string
  organizationId: Organization['id']
  categoryIds: Category['id'][]
  weekSchedule: ProviderProfile['details']['weekSchedule']
  image: ProviderProfile['basic']['image'] | File
  gallery: (ProviderProfile['details']['gallery'][number] | File)[]
  mode: 'draft' | 'publish' | 'listing'
  listed: boolean
  available: boolean
  emailNotificationPrefs: NonNullable<ProviderProfile['details']['emailNotificationPrefs']>
  paymentInfo: NonNullable<ProviderProfile['details']['paymentInfo']> | null
}>

export type GetProvidersListAPI = Endpoint<{
  payload: void
  response: BasicProvider[]
  processed: ProvidersListState['list']
}>

export type GetSingleProviderAPI = Endpoint<{
  payload: Pick<SingleProvider, 'id'>
  response: SingleProvider
  processed: SingleProvider
}>

export type GetProviderProfileAPI = Endpoint<{
  payload: void
  response: ProviderProfile
  processed: ProviderProfile
}>

export type PutProviderProfileAPI = Endpoint<{
  payload: PutProviderProfileRequestPayload
  response: ProviderProfile
  processed: ProviderProfile
}>

export type DeleteProviderServiceAPI = Endpoint<{
  payload: {
    providerId: ProviderProfile['id']
    serviceId: ProviderService['id']
  }
}>

export type PutProviderServiceAPI = Endpoint<{
  payload: {
    providerId: ProviderProfile['id']
    service: Partial<ProviderServiceResponse>
  }
  response: ProviderServiceResponse
  processed: ProviderService
}>
