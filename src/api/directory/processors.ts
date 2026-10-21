import { DIRECTORIES_PRESENT, DirectoryPresence } from '@constants/header'
import { GetDirectoryPresenceAPI } from './types'

const isPresence = (value: unknown): value is DirectoryPresence => {
  if (!value || typeof value !== 'object') return false
  const presence = value as DirectoryPresence
  return (
    typeof presence.providers === 'boolean' &&
    typeof presence.categories === 'boolean' &&
    typeof presence.organizations === 'boolean'
  )
}

/** A payload that is not three booleans keeps the links visible. Hiding them on a bad read would be the worse miss. */
export const processDirectoryPresenceResponse: GetDirectoryPresenceAPI['processor'] = (response) =>
  isPresence(response.value) ? response.value : DIRECTORIES_PRESENT
