import { PROVIDER_ROLES } from '@constants/roles'

export type ProviderRole = (typeof PROVIDER_ROLES)[keyof typeof PROVIDER_ROLES]
