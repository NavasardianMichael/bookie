import { GET as consumerAppointments } from '@app/[lang]/consumers/profile/appointments/route'
import { GET as providerBookings } from '@app/[lang]/providers/(account)/profile/bookings/route'
import { GET as providerConsumerBookings } from '@app/[lang]/providers/(account)/profile/consumer-bookings/route'
import { GET as providerHistory } from '@app/[lang]/providers/(account)/profile/history/route'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

/**
 * The retired booking tabs, which all land on `/bookings` now.
 *
 * Pinned for the reason `vanityLink.spec.ts` gives: these sit inside the settings layouts,
 * so a `page.tsx` calling `redirect()` would stream a 200 with no `Location` and merely
 * look right in a browser. Old bookmarks and any link still in an inbox depend on a real
 * redirect.
 */
const RETIRED = [
  ['/consumers/profile/appointments', consumerAppointments],
  ['/providers/profile/bookings', providerBookings],
  ['/providers/profile/consumer-bookings', providerConsumerBookings],
  ['/providers/profile/history', providerHistory],
] as const

const call = (handler: (typeof RETIRED)[number][1], lang: string, path: string) =>
  handler(new NextRequest(`https://bookie.test/${lang}${path}`), { params: Promise.resolve({ lang }) })

describe.each(RETIRED)('GET /[lang]%s', (path, handler) => {
  it('answers with a real 307 to /bookings, never a 308', async () => {
    const response = await call(handler, 'en', path)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://bookie.test/en/bookings')
  })

  it('keeps the visitor in the locale they arrived in', async () => {
    const response = await call(handler, 'hy', path)
    expect(response.headers.get('location')).toBe('https://bookie.test/hy/bookings')
  })

  it('falls back to the default locale for a segment that is not one of ours', async () => {
    const response = await call(handler, 'klingon', path)
    expect(response.headers.get('location')).toBe('https://bookie.test/en/bookings')
  })
})
