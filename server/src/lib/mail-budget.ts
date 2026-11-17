/**
 * What the mail engine says is left of its rate-limit window, as of its last response.
 *
 * The engine allows 10 requests a minute per IP (fixed window), counted across **both**
 * endpoints, and it only ever sees this server — so verification links, booking mail, the
 * contact form and the reminder job all spend one budget. It reports that budget on every
 * `/mail` response (`RateLimit-Remaining`, and `RateLimit-Reset` in seconds), and this keeps
 * the latest report so a caller can look before it spends:
 *
 * - `mail.ts` refuses locally while a `429` window is still open, instead of spending a
 *   request the engine is certain to refuse.
 * - The reminder job stops its sweep while the budget is low, leaving the rest unclaimed
 *   for the next minute rather than claiming sends the engine will answer with `429`.
 *
 * Import-free (`now` injected) so `tests/unit/server/` can reach it. In-process, like
 * `rateLimit.ts`; a second API instance shares the engine's budget without seeing it.
 */

/** The engine's window when a `429` arrives without a `RateLimit-Reset` header. */
const FALLBACK_WINDOW_MS = 60_000

type Report = {
  remaining: number
  /** Epoch ms at which the engine's window rolls over and `remaining` stops applying. */
  resetAt: number
}

export type MailBudget = {
  /** Records the budget a response reports. A response without the headers changes nothing. */
  observe: (headers: Pick<Headers, 'get'>, status: number, now: number) => void
  /** Requests left in the engine's current window; `Infinity` when nothing current is known. */
  remaining: (now: number) => number
  /** Whole seconds until the window reopens when it is spent, else `null`. */
  blockedForSeconds: (now: number) => number | null
}

const readCount = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export const createMailBudget = (): MailBudget => {
  let report: Report | null = null

  const current = (now: number): Report | null => (report && now < report.resetAt ? report : null)

  return {
    observe: (headers, status, now) => {
      const reset = readCount(headers.get('RateLimit-Reset'))
      const resetAt = reset === null ? now + FALLBACK_WINDOW_MS : now + reset * 1000

      if (status === 429) {
        report = { remaining: 0, resetAt }
        return
      }

      const remaining = readCount(headers.get('RateLimit-Remaining'))
      if (remaining !== null) report = { remaining, resetAt }
    },

    remaining: (now) => current(now)?.remaining ?? Infinity,

    blockedForSeconds: (now) => {
      const live = current(now)
      if (!live || live.remaining > 0) return null
      return Math.max(1, Math.ceil((live.resetAt - now) / 1000))
    },
  }
}
