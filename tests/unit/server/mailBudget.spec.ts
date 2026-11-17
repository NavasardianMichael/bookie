import { describe, expect, it } from 'vitest'
// Import-free on purpose, like `rateLimit.ts` — `mail.ts` itself reads config.
import { createMailBudget } from '../../../server/src/lib/mail-budget'

/**
 * The mail engine allows 10 requests a minute across every send this server makes and
 * reports what is left on each response. The reminder job stops on this before claiming a
 * send; reading it wrong either drops reminders into a `429` or stalls them.
 */
const headers = (values: Record<string, string>): Pick<Headers, 'get'> => new Headers(values)

describe('createMailBudget', () => {
  it('knows nothing until the engine reports, so nothing is held back', () => {
    const budget = createMailBudget()

    expect(budget.remaining(0)).toBe(Infinity)
    expect(budget.blockedForSeconds(0)).toBeNull()
  })

  it('reads the remaining count until the reported window rolls over', () => {
    const budget = createMailBudget()
    budget.observe(headers({ 'RateLimit-Remaining': '4', 'RateLimit-Reset': '30' }), 200, 1_000)

    expect(budget.remaining(1_000)).toBe(4)
    expect(budget.remaining(30_999)).toBe(4)
    expect(budget.remaining(31_000)).toBe(Infinity)
  })

  it('is not blocked while any request remains', () => {
    const budget = createMailBudget()
    budget.observe(headers({ 'RateLimit-Remaining': '1', 'RateLimit-Reset': '30' }), 200, 0)

    expect(budget.blockedForSeconds(0)).toBeNull()
  })

  it('blocks on a spent window, in whole seconds until it reopens', () => {
    const budget = createMailBudget()
    budget.observe(headers({ 'RateLimit-Remaining': '0', 'RateLimit-Reset': '12' }), 200, 0)

    expect(budget.remaining(0)).toBe(0)
    expect(budget.blockedForSeconds(0)).toBe(12)
    expect(budget.blockedForSeconds(11_500)).toBe(1)
    expect(budget.blockedForSeconds(12_000)).toBeNull()
  })

  it('treats a 429 as spent, falling back to a minute when no reset is reported', () => {
    const budget = createMailBudget()
    budget.observe(headers({}), 429, 0)

    expect(budget.remaining(0)).toBe(0)
    expect(budget.blockedForSeconds(0)).toBe(60)
    expect(budget.blockedForSeconds(60_000)).toBeNull()
  })

  it('keeps the last report when a response carries no rate-limit headers', () => {
    const budget = createMailBudget()
    budget.observe(headers({ 'RateLimit-Remaining': '5', 'RateLimit-Reset': '30' }), 200, 0)
    budget.observe(headers({}), 500, 1_000)

    expect(budget.remaining(1_000)).toBe(5)
  })

  it('ignores a malformed count rather than reading it as zero', () => {
    const budget = createMailBudget()
    budget.observe(headers({ 'RateLimit-Remaining': 'soon', 'RateLimit-Reset': '30' }), 200, 0)

    expect(budget.remaining(0)).toBe(Infinity)
  })
})
