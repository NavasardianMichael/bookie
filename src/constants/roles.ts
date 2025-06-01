import { pick } from '@helpers/commons'

export const ROLES = {
  guest: 'guest',
  provider: 'provider',
  admin: 'admin',
  consumer: 'consumer',
} as const

export const PUBLIC_ROLES = pick(ROLES, [ROLES.guest])

export const PROVIDER_ROLES = pick(ROLES, [ROLES.provider, ROLES.admin])

export const CONSUMER_ROLES = pick(ROLES, [ROLES.consumer])
