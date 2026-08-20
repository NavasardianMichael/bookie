import { BasicProvider } from '@store/providers/list/types'
import { ProviderProfile } from '@store/providers/profile/types'
import { ProviderService } from '@store/providers/profile/types'
import { SingleProvider } from '@store/providers/single/types'
import { Normalized } from '@interfaces/commons'
import {
  GetProviderProfileAPI,
  GetProvidersListAPI,
  GetSingleProviderAPI,
  PutProviderServiceAPI,
} from './types'

function normalizeServices(services: ProviderService[] | undefined): Normalized<ProviderService> {
  if (!services?.length) return { allIds: [], byId: {} }
  return services.reduce(
    (acc, service) => {
      acc.byId[service.id] = service
      acc.allIds.push(service.id)
      return acc
    },
    { allIds: [] as string[], byId: {} as Normalized<ProviderService>['byId'] }
  )
}

function normalizeServicesFromRecord(services: Normalized<ProviderService> | undefined): Normalized<ProviderService> {
  if (!services) return { allIds: [], byId: {} }
  if (services.allIds?.length) return services
  return normalizeServices(Object.values(services.byId ?? {}))
}

export const processProvidersListResponse: GetProvidersListAPI['processor'] = (response) => {
  return response.value.reduce(
    (acc, provider) => {
      const item = provider as BasicProvider
      acc.byId[item.id] = item
      acc.allIds.push(item.id)
      return acc
    },
    {
      allIds: [],
      byId: {},
    } as GetProvidersListAPI['processed']
  )
}

export const processSingleProviderResponse: GetSingleProviderAPI['processor'] = (provider) => {
  const value = provider.value as SingleProvider
  return {
    ...value,
    services: normalizeServicesFromRecord(value.services),
  }
}

export const processProviderProfileResponse: GetProviderProfileAPI['processor'] = (providerProfile) => {
  const value = providerProfile.value as ProviderProfile
  return {
    ...value,
    services: normalizeServicesFromRecord(value.services),
  }
}

export const processProviderServiceResponse: PutProviderServiceAPI['processor'] = (response) => {
  return response.value as PutProviderServiceAPI['processed']
}
