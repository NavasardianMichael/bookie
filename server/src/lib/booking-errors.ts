/**
 * Error messages a booking write can answer that the client has to *act* on rather
 * than merely display.
 *
 * This module imports nothing, deliberately — that is what keeps it reachable from
 * `tests/unit/server/`, where a spec imports it side by side with the web constant it
 * has to equal. Same reasoning, and the same trap, as `lib/return-path.ts`: two halves
 * of one agreement living in packages with no shared type, where a rename on one side
 * typechecks, lints, builds, and turns a recoverable outcome back into a red toast.
 * See `server/CLAUDE.md`.
 */

/**
 * "Somebody took that time while you were filling in the form."
 *
 * The status code alone is not enough to recognise it: `createAppointment` also answers
 * `409` for a service the provider has withdrawn, and only one of the two is fixed by
 * picking another slot. The booking sheet matches on this text to decide whether to
 * offer that, so the spelling is a contract — not a sentence to reword in place.
 */
export const SLOT_TAKEN_MESSAGE = 'Time slot not available'

/**
 * "This provider is not taking bookings online right now" — a refusal no choice of slot
 * or service can fix, so the booking sheet swaps its calendar for a notice pointing at
 * the provider's contact details.
 *
 * Stable codes carried in the envelope's `code`, the way `AUTH_ERROR` is, rather than a
 * matched message: the status is `409` like every other refusal on this route, and a code
 * is the contract `SLOT_TAKEN_MESSAGE` would be if it were written today. Mirrored in
 * `src/constants/booking.ts`, pinned by `tests/unit/server/bookingErrors.spec.ts`.
 *
 * - `bookingPaused` — the provider switched `available` off.
 * - `bookingFull` — the provider's plan allows no more bookings this month. The message
 *   the client shows never names the plan: the visitor is not the one who pays.
 */
export const BOOKING_ERROR = {
  bookingPaused: 4201,
  bookingFull: 4202,
} as const
