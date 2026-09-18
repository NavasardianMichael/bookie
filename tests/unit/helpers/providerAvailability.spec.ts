import { describe, expect, it } from 'vitest'
import { getProviderAvailabilityStatus } from '@helpers/providerAvailability'

describe('getProviderAvailabilityStatus', () => {
  it('treats a paused provider as fully blocked, even when today has hours', () => {
    expect(getProviderAvailabilityStatus(false, true)).toBe('fullyBlocked')
    expect(getProviderAvailabilityStatus(false, false)).toBe('fullyBlocked')
  })

  it('treats an accepting provider with no hours today as closed', () => {
    expect(getProviderAvailabilityStatus(true, false)).toBe('closed')
  })

  it('treats an accepting provider with hours today as available', () => {
    expect(getProviderAvailabilityStatus(true, true)).toBe('available')
  })

  it('defaults a missing openToday to available, matching payloads from before the field', () => {
    expect(getProviderAvailabilityStatus(true)).toBe('available')
    expect(getProviderAvailabilityStatus(true, undefined)).toBe('available')
  })
})
