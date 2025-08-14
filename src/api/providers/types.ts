import { UploadFile } from 'antd'
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
  PhoneNumberCode: string
  PhoneNumber: string
  Categories: Provider['basic']['categories']
  Address: string
  LocationURL: string
  Description?: string
  Organization?: Provider['basic']['organization']
  Image?: string
  Email?: string
  Country?: string
}

type ProviderResponse = ProviderProfileResponse

export type BasicProviderResponse = Pick<
  ProviderProfileResponse,
  'Id' | 'FirstName' | 'LastName' | 'Description' | 'Image' | 'Categories' | 'Organization'
>

// ---------------------------------------------
// Payloads
// ---------------------------------------------
export type PutProviderProfileRequestPayload = Partial<
  Omit<
    ProviderProfileResponse,
    'Id' | 'PhoneNumber' | 'PhoneNumberCode' | 'Categories' | 'Organization' | 'Country' | 'Image'
  > & {
    Image: UploadFile
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

export type PutProviderProviderProfileAPI = Endpoint<{
  payload: PutProviderProfileRequestPayload
}>
