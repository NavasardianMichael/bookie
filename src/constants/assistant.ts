/**
 * Stable codes from the API's `ASSISTANT_ERROR` (`server/src/lib/assistant-errors.ts`), pinned
 * by `tests/unit/server/assistant.spec.ts`. Their copy is `Errors.codes.*`.
 */
export const ASSISTANT_ERROR_CODES = {
  assistantUnavailable: 4501,
  assistantUnreadable: 4502,
  visitorAssistantOff: 4503,
  visitorAssistantBusy: 4504,
} as const

/**
 * A provider's message and a visitor's question, at most. Keep in step with
 * `ASSISTANT_MESSAGE_MAX` (`server/src/services/assistant.ts`) and `VISITOR_MESSAGE_MAX`
 * (`server/src/services/visitorAssistant.ts`), which refuse more — pinned by the same spec.
 */
export const ASSISTANT_MESSAGE_MAX = 1000
export const VISITOR_MESSAGE_MAX = 500

/** Turns of a visitor's conversation sent back with each question (`VISITOR_TURNS_MAX` on the API). */
export const VISITOR_TURNS_MAX = 12

/** Where a visitor's conversation is kept: this browser's localStorage, one per provider page (`useVisitorAssistantChat`). */
export const VISITOR_ASSISTANT_STORAGE_PREFIX = 'bookie:visitor-assistant:'
