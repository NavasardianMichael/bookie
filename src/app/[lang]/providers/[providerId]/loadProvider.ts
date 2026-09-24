import { cache } from 'react'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getSingleProviderAPI } from '@api/providers/main'
import { isNotFoundError } from '@helpers/error'

/**
 * Dedupes `generateMetadata`, the layout, and the page within one request.
 * `cache` keys on the id, so the layout can paint the identity column and the
 * page can still hand the same provider to the booking panels.
 */
export const loadProvider = cache(async (providerId: string) => {
  const cookie = (await cookies()).toString()
  try {
    return await getSingleProviderAPI({ id: providerId, cookie })
  } catch (error) {
    if (isNotFoundError(error)) notFound()
    throw error
  }
})
