import { describe, expect, it } from 'vitest'
import { isSamePageUrl } from '@helpers/unsavedChanges'

const HERE = 'http://localhost:7004/en/providers/profile?tab=1#hours'

describe('isSamePageUrl', () => {
  it('treats a hash or query change as the same page', () => {
    expect(isSamePageUrl('/en/providers/profile?tab=1#name', HERE)).toBe(true)
    expect(isSamePageUrl('http://localhost:7004/en/providers/profile?tab=1', HERE)).toBe(true)
    expect(isSamePageUrl('/en/providers/profile?tab=2', HERE)).toBe(true)
  })

  it('treats another path or origin as leaving', () => {
    expect(isSamePageUrl('/en/providers/profile/availability', HERE)).toBe(false)
    expect(isSamePageUrl('/es/providers/profile?tab=1', HERE)).toBe(false)
    expect(isSamePageUrl('https://example.com/en/providers/profile?tab=1', HERE)).toBe(false)
  })

  it('resolves a relative destination against the current page', () => {
    expect(isSamePageUrl('?tab=1', HERE)).toBe(true)
    expect(isSamePageUrl('../profile/seo', HERE)).toBe(false)
  })
})
