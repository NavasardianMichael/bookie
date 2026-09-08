import { describe, expect, it } from 'vitest'
import { processPostContactMessageResponse } from '@api/contact/processors'
import { APIResponse } from '@interfaces/api'

const envelope = <T>(value: T): APIResponse<T> => ({ value, error: null })

describe('processPostContactMessageResponse', () => {
  // The form renders nothing from the response, so discarding it is the contract rather
  // than an omission. Pinned so a later "unwrap the value" edit is a visible change.
  it('discards the envelope and yields undefined', () => {
    expect(processPostContactMessageResponse(envelope(true))).toBeUndefined()
  })

  it('yields undefined for a falsy value too, rather than returning it', () => {
    expect(processPostContactMessageResponse(envelope(false))).toBeUndefined()
  })
})
