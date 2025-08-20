import { BasicProvider } from '@store/providers/list/types'
import { ProviderProfile } from '@store/providers/profile/types'
import { SingleProvider } from '@store/providers/single/types'
import {
  BasicProviderResponse,
  GetProviderProfileAPI,
  GetProvidersListAPI,
  GetSingleProviderAPI,
  ProviderProfileResponse,
  SingleProviderResponse,
} from './types'

export const processProvidersListResponse: GetProvidersListAPI['processor'] = (response) => {
  return response.value.reduce(
    (acc, provider) => {
      const processedProvider = processBasicProvider(provider)
      acc.byId[processedProvider.id] = processedProvider
      acc.allIds.push(processedProvider.id)
      return acc
    },
    {
      allIds: [],
      byId: {},
    } as GetProvidersListAPI['processed']
  )
}

export const processSingleProviderResponse: GetSingleProviderAPI['processor'] = (provider) => {
  return processSingleProvider(provider.value)
}

export const processProviderProfileResponse: GetProviderProfileAPI['processor'] = (providerProfile) => {
  return processProviderProfile(providerProfile.value)
}

export const processProviderProfile = (provider: ProviderProfileResponse): ProviderProfile => {
  return {
    id: provider.Id,
    basic: {
      firstName: provider.FirstName,
      lastName: provider.LastName,
      categories: provider.Categories,
      description: provider.Description,
      image: provider.Image,
      organization: provider.Organization,
      available: provider.Available,
    },
    details: {
      location: {
        address: provider.Address,
        url: provider.LocationURL,
      },
      phone: {
        code: +provider.PhoneNumberCode,
        number: +provider.PhoneNumber,
      },
      country: provider.Country,
      email: provider.Email,
      gallery: [],
      weekSchedule: provider.WeekSchedule,
    },
    services: [],
    personal: {
      plan: provider.Plan,
    },
  }
}

export const processSingleProvider = (provider: SingleProviderResponse): SingleProvider => {
  return {
    id: provider.Id,
    basic: {
      firstName: provider.FirstName,
      lastName: provider.LastName,
      categories: provider.Categories,
      description: provider.Description,
      image: provider.Image,
      organization: provider.Organization,
      available: provider.Available,
    },
    details: {
      location: {
        address: provider.Address,
        url: provider.LocationURL,
      },
      phone: {
        code: +provider.PhoneNumberCode,
        number: +provider.PhoneNumber,
      },
      country: provider.Country,
      email: provider.Email,
      gallery: [],
      weekSchedule: provider.WeekSchedule,
    },
    services: [],
  }
}

export const processBasicProvider = (provider: BasicProviderResponse): BasicProvider => {
  return {
    id: provider.Id,
    basic: {
      firstName: provider.FirstName,
      lastName: provider.LastName,
      categories: provider.Categories,
      description: provider.Description,
      image: provider.Image,
      organization: provider.Organization,
      available: provider.Available,
    },
  }
}
