import { BasicProvider } from '@store/providers/list/types'
import { ProviderProfile } from '@store/providers/profile/types'
import { ProviderService } from '@store/providers/profile/types'
import { SingleProvider } from '@store/providers/single/types'
import { Normalized } from '@interfaces/commons'
import {
  GetProviderProfileAPI,
  GetProvidersListAPI,
  GetSingleProviderAPI,
  PatchProviderSeoAPI,
  PutProviderServiceAPI,
} from './types'

/** The shapes `services` has actually arrived in, plus the array the API may yet send. */
type ServicesPayload = Normalized<ProviderService> | ProviderService[] | undefined

const emptyServices = (): Normalized<ProviderService> => ({ allIds: [], byId: {} })

function normalizeServices(services: ProviderService[] | undefined): Normalized<ProviderService> {
  if (!services?.length) return emptyServices()
  return services.reduce(
    (acc, service) => {
      acc.byId[service.id] = service
      acc.allIds.push(service.id)
      return acc
    },
    { allIds: [] as string[], byId: {} as Normalized<ProviderService>['byId'] }
  )
}

/**
 * Accepts every shape `services` can arrive in and always yields a `Normalized`.
 *
 * The array check is load-bearing rather than defensive padding: an array has neither
 * `allIds` nor `byId`, so without it the function fell through to `Object.values({})`
 * and silently returned nothing — making `normalizeServices` unreachable and dropping
 * every service. The server currently pre-normalizes, which is the only reason that
 * never surfaced.
 */
function normalizeServicesPayload(services: ServicesPayload): Normalized<ProviderService> {
  if (!services) return emptyServices()
  if (Array.isArray(services)) return normalizeServices(services)
  if (services.allIds?.length) return services
  return normalizeServices(Object.values(services.byId ?? {}))
}

/**
 * Splits the paged envelope into the two things the page needs: the normalized rows,
 * and the window the API actually served. `page` is read back rather than echoed —
 * the API clamps an out-of-range request, so the pager must render its answer.
 */
export const processProvidersListResponse: GetProvidersListAPI['processor'] = (response) => {
  const { items, total, page, perPage, pageCount } = response.value

  const list = items.reduce(
    (acc, provider) => {
      const item = provider as BasicProvider
      acc.byId[item.id] = item
      acc.allIds.push(item.id)
      return acc
    },
    {
      allIds: [],
      byId: {},
    } as GetProvidersListAPI['processed']['list']
  )

  return { list, pagination: { total, page, perPage, pageCount } }
}

export const processSingleProviderResponse: GetSingleProviderAPI['processor'] = (provider) => {
  const value = provider.value as SingleProvider
  return {
    ...value,
    services: normalizeServicesPayload(value.services),
  }
}

export const processProviderProfileResponse: GetProviderProfileAPI['processor'] = (providerProfile) => {
  const value = providerProfile.value as ProviderProfile
  return {
    ...value,
    services: normalizeServicesPayload(value.services),
  }
}

export const processProviderServiceResponse: PutProviderServiceAPI['processor'] = (response) => {
  return response.value as PutProviderServiceAPI['processed']
}

/** `?? {}` so a provider who has never opened the SEO tab reads as "no overrides set". */
export const processProviderSeoResponse: PatchProviderSeoAPI['processor'] = (response) => response.value ?? {}
