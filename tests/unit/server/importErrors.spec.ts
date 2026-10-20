import { describe, expect, it } from 'vitest'
// Aliased web constants beside relative server modules: each test here pins an agreement
// between the two packages, which share no type (tests/CLAUDE.md).
import { IMPORT_ERROR_CODES, IMPORT_MAX_ROWS, IMPORT_NOTE_MAX } from '@constants/bookingImport'
import { IMPORT_ERROR } from '../../../server/src/lib/import-errors'
import {
  IMPORT_MAX_ROWS as SERVER_MAX_ROWS,
  IMPORT_NOTE_MAX as SERVER_NOTE_MAX,
} from '../../../server/src/services/bookingImport'

/**
 * The photo import's cross-package agreements. A rename on one side alone typechecks and
 * ships: an unreadable photo falls back to generic copy instead of "try another photo", or the
 * review sheet lets through a batch the API then refuses.
 */
describe('the photo import error codes', () => {
  it('are numbered the same on both sides of the wire', () => {
    expect(IMPORT_ERROR_CODES).toEqual(IMPORT_ERROR)
  })
})

describe('the photo import limits', () => {
  it('are the same on both sides', () => {
    expect(IMPORT_MAX_ROWS).toBe(SERVER_MAX_ROWS)
    expect(IMPORT_NOTE_MAX).toBe(SERVER_NOTE_MAX)
  })
})
