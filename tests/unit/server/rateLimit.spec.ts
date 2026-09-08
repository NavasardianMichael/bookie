import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// The server is a separate package with no path alias, and this module deliberately has
// no imports of its own — which is what makes it reachable from this suite at all.
// Anything importing `../config.js` cannot be tested here without stubbing env.
import { createRateLimiter } from '../../../server/src/lib/rateLimit'

/**
 * This guards the mail engine's shared quota: it rate-limits 10/minute per IP *as it sees
 * them*, and it only ever sees our server, so every visitor shares one bucket with
 * transactional mail. Exercising the real limit end-to-end would mean sending five real
 * emails per run, so the behaviour is pinned here instead.
 */
describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows exactly `limit` requests in a window, then refuses', () => {
    const limit = createRateLimiter({ limit: 3, windowMs: 60_000 })

    expect(limit('1.1.1.1').allowed).toBe(true)
    expect(limit('1.1.1.1').allowed).toBe(true)
    expect(limit('1.1.1.1').allowed).toBe(true)
    expect(limit('1.1.1.1').allowed).toBe(false)
  })

  it('keys independently, so one caller cannot exhaust another', () => {
    const limit = createRateLimiter({ limit: 1, windowMs: 60_000 })

    expect(limit('1.1.1.1').allowed).toBe(true)
    expect(limit('1.1.1.1').allowed).toBe(false)
    expect(limit('2.2.2.2').allowed).toBe(true)
  })

  it('reports whole seconds until the window rolls over', () => {
    const limit = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limit('1.1.1.1')

    vi.advanceTimersByTime(20_000)

    const verdict = limit('1.1.1.1')
    expect(verdict.allowed).toBe(false)
    if (verdict.allowed) throw new Error('unreachable')
    expect(verdict.retryAfterSeconds).toBe(40)
  })

  it('never reports a retry of 0, which a client would read as "retry immediately"', () => {
    const limit = createRateLimiter({ limit: 1, windowMs: 60_000 })
    limit('1.1.1.1')

    // 1ms before the window ends: the true remainder rounds to 0.
    vi.advanceTimersByTime(59_999)

    const verdict = limit('1.1.1.1')
    if (verdict.allowed) throw new Error('expected refusal')
    expect(verdict.retryAfterSeconds).toBe(1)
  })

  it('lets the caller through again once the window has passed', () => {
    const limit = createRateLimiter({ limit: 2, windowMs: 60_000 })
    limit('1.1.1.1')
    limit('1.1.1.1')
    expect(limit('1.1.1.1').allowed).toBe(false)

    vi.advanceTimersByTime(60_001)

    expect(limit('1.1.1.1').allowed).toBe(true)
  })

  it('is a fixed window, not a sliding one — the budget resets whole', () => {
    const limit = createRateLimiter({ limit: 2, windowMs: 60_000 })
    limit('1.1.1.1')

    vi.advanceTimersByTime(59_000)
    limit('1.1.1.1')
    expect(limit('1.1.1.1').allowed).toBe(false)

    // Past the *first* request's window, so the whole allowance returns at once.
    vi.advanceTimersByTime(2_000)
    expect(limit('1.1.1.1').allowed).toBe(true)
    expect(limit('1.1.1.1').allowed).toBe(true)
    expect(limit('1.1.1.1').allowed).toBe(false)
  })

  it('forgets keys whose window has expired, so the map cannot grow without bound', () => {
    const limit = createRateLimiter({ limit: 1, windowMs: 60_000 })
    for (let i = 0; i < 50; i += 1) limit(`10.0.0.${i}`)

    vi.advanceTimersByTime(60_001)

    // The sweep runs on the next write; every earlier key is gone, so each is fresh.
    expect(limit('10.0.0.0').allowed).toBe(true)
    expect(limit('10.0.0.49').allowed).toBe(true)
  })
})
