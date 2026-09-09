import { GetSingleProviderAPI } from '@api/providers/types'
import { StateCommonProps } from '@interfaces/store'
import { ProviderProfile } from '../profile/types'

/**
 * `seo` is here because the public detail page's `generateMetadata` reads it off this
 * payload to decide the title and description. They are meta tags, so nothing about
 * them is owner-only — unlike `personal`, `listed` and `draft`, which stay off it.
 */
export type SingleProvider = Pick<ProviderProfile, 'id' | 'basic' | 'details' | 'services' | 'seo'>

export type SingleProviderState = StateCommonProps & SingleProvider

export type SingleProviderActions = {
  setSingleProviderState: (payload: Partial<SingleProviderState>) => void
  getSingleProvider: (args: GetSingleProviderAPI['payload']) => void
}
