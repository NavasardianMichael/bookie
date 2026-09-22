import { describe, expect, it } from 'vitest'
// The one aliased import, and the whole point of this file: the web constant is the
// *consumer* of what the server throws, and only a test holding both can catch them
// drifting apart. Same reasoning as `returnPath.spec.ts` — see `server/CLAUDE.md`.
import { SLOT_TAKEN_MESSAGE as WEB_SLOT_TAKEN_MESSAGE } from '@constants/booking'
import { ROUTES } from '@constants/routes'
import { isSlotTakenError } from '@helpers/booking'
// Relative, not aliased: `server/` is a separate package. This module imports nothing at
// all, which is what keeps it reachable here and is the stated reason it exists.
import { SLOT_TAKEN_MESSAGE } from '../../../server/src/lib/booking-errors'
// `return-path.ts`, not `booking-mail.ts`, which re-exports it: that one pulls in config
// and the mail client and is out of reach here. Moving the constant is what made this
// assertion possible at all.
import { buildApprovalsUrl, PROVIDER_APPROVALS_PATH } from '../../../server/src/lib/return-path'

/**
 * Two agreements between the API and the web app that nothing else can check.
 *
 * Both are plain strings crossing a package boundary with no shared type, so a rename on
 * one side typechecks, lints, builds and ships — and the symptom is silent in each case:
 * a recoverable "pick another time" degrades into a raw red toast, and an emailed
 * approval link lands on a 404.
 */
describe('the slot-taken message', () => {
  it('is spelled the same on both sides of the wire', () => {
    expect(WEB_SLOT_TAKEN_MESSAGE).toBe(SLOT_TAKEN_MESSAGE)
  })

  it('is recognised by the booking sheet when it arrives as a 409', () => {
    expect(isSlotTakenError({ code: 409, message: SLOT_TAKEN_MESSAGE })).toBe(true)
  })

  // The status is checked as well as the text: a matching message on anything but a 409
  // is a coincidence, not the outcome this branch handles.
  it('is not recognised on another status', () => {
    expect(isSlotTakenError({ code: 500, message: SLOT_TAKEN_MESSAGE })).toBe(false)
  })

  /**
   * The reason this is matched on text rather than on `409` alone. `POST /appointments`
   * answers 409 for a withdrawn service too, and telling that visitor to choose another
   * time would send them round a loop with no exit.
   */
  it('does not swallow the other 409s the booking route can answer', () => {
    expect(isSlotTakenError({ code: 409, message: 'This service is no longer available' })).toBe(false)
    expect(isSlotTakenError({ code: 409, message: 'A phone number is required to book' })).toBe(false)
  })
})

describe('the approvals link', () => {
  it('points at the route that actually exists', () => {
    expect(PROVIDER_APPROVALS_PATH).toBe(ROUTES.providerProfileApprovals)
  })

  // `ROUTES` is locale-free by construction and the builder adds the prefix. Asserting
  // the built URL rather than the constant catches the double-prefix this pairing invites.
  it('builds an absolute URL with exactly one locale segment', () => {
    expect(buildApprovalsUrl('https://bookie.example', 'hy')).toBe(
      'https://bookie.example/hy/providers/profile/approvals'
    )
  })

  // A trailing slash on `CORS_ORIGIN` is ordinary and must not double up.
  it('tolerates a trailing slash on the origin', () => {
    expect(buildApprovalsUrl('https://bookie.example/', 'en')).toBe(
      'https://bookie.example/en/providers/profile/approvals'
    )
  })
})
