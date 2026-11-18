/**
 * Stable application codes for an AI-assistant answer the client must react to rather than
 * merely display — the provider's own assistant and the public page's. Mirrored as
 * `ASSISTANT_ERROR_CODES` in `src/constants/assistant.ts`.
 *
 * This module imports nothing, for the reason `lib/plan-errors.ts` gives:
 * `tests/unit/server/assistant.spec.ts` imports it beside the web constant it must equal.
 *
 * - `assistantUnavailable` — no Gemini key on this deployment (`isGeminiConfigured`). The button
 *   stays, and says the assistant is not available right now, rather than vanishing.
 * - `assistantUnreadable` — the message reached the model and nothing usable came back: it
 *   refused it, or answered empty. Rewording may help; resending the same text will not.
 * - `visitorAssistantOff` — this public page has no assistant: switched off, or its plan no
 *   longer allows it. Worded for a visitor, so it never names a plan.
 * - `visitorAssistantBusy` — the page's questions for today are spent. Plan-neutral for the
 *   same reason as `BOOKING_ERROR.bookingFull`: the visitor is told to come back or to contact
 *   the provider, never why.
 *
 * A provider's spent daily allowance is `PLAN_ERROR.assistantLimit`, and a plan without the
 * assistant `PLAN_ERROR.featureLocked` — plan answers, with the plan's copy and upgrade link.
 */
export const ASSISTANT_ERROR = {
  assistantUnavailable: 4501,
  assistantUnreadable: 4502,
  visitorAssistantOff: 4503,
  visitorAssistantBusy: 4504,
} as const
