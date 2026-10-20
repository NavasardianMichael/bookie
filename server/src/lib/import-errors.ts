/**
 * Stable application codes for a photo import the client must react to rather than merely
 * display. Mirrored as `IMPORT_ERROR_CODES` in `src/constants/bookingImport.ts`.
 *
 * This module imports nothing, for the reason `lib/plan-errors.ts` gives:
 * `tests/unit/server/importErrors.spec.ts` imports it beside the web constant it must equal.
 *
 * - `photoImportUnavailable` — no Gemini key on this deployment (`isGeminiConfigured`). The button
 *   stays, and says photo import is not available right now, rather than vanishing.
 * - `photoUnreadable` — the photo reached the model and nothing came back: it refused the image,
 *   or answered empty. Another photo may work; the same one will not.
 *
 * A spent daily allowance is `PLAN_ERROR.photoImportLimit` — a plan answer, with the plan's
 * copy and upgrade link. Google's own rate limit is a plain `429`, which the client already
 * words as "try again shortly".
 */
export const IMPORT_ERROR = {
  photoImportUnavailable: 4401,
  photoUnreadable: 4402,
} as const
