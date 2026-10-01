/**
 * The API's answer when the slot went while the visitor was filling in the sheet.
 *
 * Mirrors `SLOT_TAKEN_MESSAGE` in `server/src/lib/booking-errors.ts`, which is what
 * throws it, and the two are pinned together by `tests/unit/server/bookingErrors.spec.ts` —
 * exactly as `EMAIL_VERIFY_QUERY` is pinned to the server's copy. A rename on one side
 * alone is silent: the sheet stops recognising the one 409 it can actually help with and
 * falls back to showing the raw message, which is the state this whole pairing exists to
 * get out of.
 *
 * Matching on the text rather than the status is deliberate. `POST /appointments` also
 * answers `409` for a service the provider has withdrawn and for a booker with no phone
 * number on file, and neither is fixed by choosing another time.
 */
export const SLOT_TAKEN_MESSAGE = 'Time slot not available'

/**
 * Stable codes from the API's `BOOKING_ERROR` (`server/src/lib/booking-errors.ts`) for a
 * provider who is not taking bookings online — paused by their own switch, or their
 * monthly allowance reached. Pinned to the server's copy by
 * `tests/unit/server/bookingErrors.spec.ts`. The booking sheet reacts to either by
 * swapping its calendar for the contact notice, so they are codes and not messages.
 */
export const BOOKING_ERROR_CODES = {
  bookingPaused: 4201,
  bookingFull: 4202,
} as const

/**
 * `details.onlineBooking` on the public provider payload. The two closed states differ
 * only in their copy; neither names a plan, because the visitor is not the one who pays.
 */
export const ONLINE_BOOKING = {
  open: 'open',
  paused: 'paused',
  full: 'full',
} as const

/**
 * How far ahead the public booking grid asks for booked intervals in one request.
 *
 * A calendar month plus a day at each end, so a month whose grid spills into the
 * neighbouring weeks is covered by the same call the month itself needs. Well inside the
 * 100-day window `GET /providers/:id/busy` will serve.
 */
export const BUSY_WINDOW_PADDING_DAYS = 7
