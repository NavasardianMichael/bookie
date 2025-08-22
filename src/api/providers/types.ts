import { Category } from '@store/categories/single/types'
import { Organization } from '@store/organizations/single/types'
import { ProvidersListState } from '@store/providers/list/types'
import { ProviderProfile, ProviderService } from '@store/providers/profile/types'
import { SingleProvider } from '@store/providers/single/types'
import { Endpoint } from '@interfaces/api'
import { PartialButRequired } from '@interfaces/commons'
import { Plan } from '@interfaces/plans'

// ---------------------------------------------
// Responses
// ---------------------------------------------
type ProviderServiceResponse = {
  Id: string
  Name: string
  Duration: number
  CategoryId: Category['id']
  Description?: string
  Price?: number
  Currency?: string
  Image?: string
  Missing?: boolean
}

export type ProviderProfileResponse = {
  Id: string
  FirstName: string
  LastName: string
  PhoneNumberCode: string
  PhoneNumber: string
  Categories: ProviderProfile['basic']['categories']
  Address: string
  LocationURL: string
  Description?: string
  Organization?: ProviderProfile['basic']['organization']
  Image?: string
  Email?: string
  Country?: string
  Plan: Plan
  Available: boolean
  WeekSchedule: ProviderProfile['details']['weekSchedule']
  Services: ProviderServiceResponse[]
}

export type SingleProviderResponse = Omit<ProviderProfileResponse, 'Plan'>

export type BasicProviderResponse = Pick<
  ProviderProfileResponse,
  'Id' | 'FirstName' | 'LastName' | 'Description' | 'Image' | 'Categories' | 'Organization' | 'Available'
>

// ---------------------------------------------
// Payloads
// ---------------------------------------------
export type PutProviderProfileRequestPayload = Partial<
  Omit<
    ProviderProfileResponse,
    'Id' | 'PhoneNumber' | 'PhoneNumberCode' | 'Categories' | 'Organization' | 'Country' | 'Image' | 'Plan'
  > & {
    Image: ProviderProfile['basic']['image'] | File
    Gallery: (ProviderProfile['details']['gallery'][number] | File)[]
    CategoryIds: Category['id'][]
    OrganizationId: Organization['id']
  }
>

// ---------------------------------------------
// API
// ---------------------------------------------
export type GetProvidersListAPI = Endpoint<{
  payload: void
  response: BasicProviderResponse[]
  processed: ProvidersListState['list']
}>

export type GetSingleProviderAPI = Endpoint<{
  payload: Pick<SingleProvider, 'id'>
  response: SingleProviderResponse
  processed: SingleProvider
}>

export type GetProviderProfileAPI = Endpoint<{
  payload: void
  response: ProviderProfileResponse
  processed: ProviderProfile
}>

export type PutProviderProfileAPI = Endpoint<{
  payload: PutProviderProfileRequestPayload
}>

export type DeleteProviderServiceAPI = Endpoint<{
  payload: {
    providerId: ProviderProfile['id']
    serviceId: ProviderService['id']
  }
}>

export type EditProviderServiceAPI = Endpoint<{
  payload: {
    providerId: ProviderProfile['id']
    service: PartialButRequired<ProviderServiceResponse, 'Id'>
  }
}>
