import { omit, pick } from "@helpers/commons"

export const ROLES = {
  guest: 'guest',
  provider: 'provider',
  consumer: 'consumer',
  admin: 'admin',
} as const

export const PUBLIC_ROLES = pick(ROLES, [ROLES.guest])

export const PRIVATE_ROLES = omit(ROLES, [ROLES.guest])

export const PROVIDER_ROLES = pick(ROLES, [ROLES.provider, ROLES.admin])

export const CONSUMER_ROLES = pick(ROLES, [ROLES.consumer])
