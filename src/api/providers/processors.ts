import { BasicProvider } from '@store/providers/profile/types'
import { BasicProviderResponse, GetProviderAPI, GetProviderProviderProfileAPI, GetProvidersListAPI } from './types'

export const processProvidersListResponse: GetProvidersListAPI['processor'] = (response) => {
  return response.value.reduce(
    (acc, provider) => {
      const processedProvider = processBasicProvider(provider)
      acc.byId[provider.id] = processedProvider
      acc.allIds.push(processedProvider.id)
      return acc
    },
    {
      allIds: [],
      byId: {},
    } as GetProvidersListAPI['processed']
  )
}

export const processProviderResponse: GetProviderAPI['processor'] = (provider) => {
  return provider.value
}

export const processProviderProfileResponse: GetProviderProviderProfileAPI['processor'] = (providerProfile) => {
  return providerProfile.value
}

export const processBasicProvider = (provider: BasicProviderResponse): BasicProvider => {
  return provider
}
