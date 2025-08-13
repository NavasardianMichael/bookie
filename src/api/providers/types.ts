import { Category } from '@store/categories/single/types'
import { Organization } from '@store/organizations/single/types'
import { ProvidersListState } from '@store/providers/list/types'
import { Provider } from '@store/providers/profile/types'
import { Endpoint } from '@interfaces/api'

// ---------------------------------------------
// Responses
// ---------------------------------------------
export type ProviderProfileResponse = {
  Id: string
  FirstName: string
  LastName: string
  Description: string
  Image: string
  Categories: Provider['basic']['categories']
  Organization: Provider['basic']['organization']
  PhoneNumberCode: string
  PhoneNumber: string
  Email: string
  Country: string
  Address: string
  LocationURL: string
}

type ProviderResponse = ProviderProfileResponse

export type BasicProviderResponse = Pick<
  ProviderProfileResponse,
  'Id' | 'FirstName' | 'LastName' | 'Description' | 'Image' | 'Categories' | 'Organization'
>

// ---------------------------------------------
// Payloads
// ---------------------------------------------
export type PostProviderProfileRequestPayload = Partial<
  Omit<ProviderProfileResponse, 'PhoneNumber' | 'PhoneNumberCode' | 'Categories' | 'ORganization' | 'Country'> & {
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

export type GetProviderAPI = Endpoint<{
  payload: Pick<Provider, 'id'>
  response: ProviderResponse
  processed: Provider
}>

export type GetProviderProviderProfileAPI = Endpoint<{
  payload: Pick<Provider, 'id'>
  response: ProviderProfileResponse
  processed: Provider
}>

export type PostProviderProviderProfileAPI = Endpoint<{
  payload: PostProviderProfileRequestPayload
}>
