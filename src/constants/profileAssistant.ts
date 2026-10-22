/**
 * Stable codes from the API's `ASSISTANT_ERROR` (`server/src/lib/assistant-errors.ts`), pinned
 * by `tests/unit/server/profileAssistant.spec.ts`. Their copy is `Errors.codes.*`.
 */
export const ASSISTANT_ERROR_CODES = {
  assistantUnavailable: 4501,
  assistantUnreadable: 4502,
} as const

/**
 * The description box, and the services one draft may hold. Keep in step with
 * `ASSISTANT_PROMPT_MAX` / `ASSISTANT_MAX_SERVICES` in
 * `server/src/services/profileAssistant.ts`, which refuse more.
 */
export const ASSISTANT_PROMPT_MAX = 2000
export const ASSISTANT_MAX_SERVICES = 30

/** A service name's cap — `ASSISTANT_SERVICE_NAME_MAX` on the API. */
export const ASSISTANT_SERVICE_NAME_MAX = 100

/** The review's steps, in order — one per settings tab the assistant drafts, then the summary. */
export const ASSISTANT_STEPS = [
  'profile',
  'services',
  'availability',
  'approvals',
  'payments',
  'seo',
  'notifications',
  'advanced',
  'summary',
] as const
