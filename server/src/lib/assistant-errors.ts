/**
 * Stable application codes for a profile-assistant answer the client must react to rather than
 * merely display. Mirrored as `ASSISTANT_ERROR_CODES` in `src/constants/profileAssistant.ts`.
 *
 * This module imports nothing, for the reason `lib/plan-errors.ts` gives:
 * `tests/unit/server/profileAssistant.spec.ts` imports it beside the web constant it must equal.
 *
 * - `assistantUnavailable` — no Gemini key on this deployment (`isGeminiConfigured`). The button
 *   stays, and says the assistant is not available right now, rather than vanishing.
 * - `assistantUnreadable` — the description reached the model and nothing usable came back: it
 *   refused it, or answered empty. Rewording may help; resending the same text will not.
 *
 * A spent daily allowance is `PLAN_ERROR.profileAssistantLimit` — a plan answer, with the plan's
 * copy and upgrade link, as photo import's is.
 */
export const ASSISTANT_ERROR = {
  assistantUnavailable: 4501,
  assistantUnreadable: 4502,
} as const
