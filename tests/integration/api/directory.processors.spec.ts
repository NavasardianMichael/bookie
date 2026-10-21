import { describe, expect, it } from 'vitest'
import { processDirectoryPresenceResponse } from '@api/directory/processors'
import { APIResponse } from '@interfaces/api'
import { DIRECTORIES_PRESENT, type DirectoryPresence } from '@constants/header'

const envelope = (value: unknown): APIResponse<DirectoryPresence> => ({ value, error: null }) as APIResponse<DirectoryPresence>

describe('processDirectoryPresenceResponse', () => {
  it('unwraps the three booleans', () => {
    const presence = { providers: true, categories: false, organizations: true }
    expect(processDirectoryPresenceResponse(envelope(presence))).toEqual(presence)
  })

  it('keeps the links when the payload is not three booleans', () => {
    expect(processDirectoryPresenceResponse(envelope(null))).toEqual(DIRECTORIES_PRESENT)
    expect(processDirectoryPresenceResponse(envelope({ providers: true }))).toEqual(DIRECTORIES_PRESENT)
  })
})
