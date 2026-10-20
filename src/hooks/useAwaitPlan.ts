'use client'

import { useEffect, useState } from 'react'
import { getProviderPlanAPI } from '@api/plans/main'
import { ProviderPlanWithUsage } from '@interfaces/plans'
import { AWAIT_PLAN_POLL_MS, AWAIT_PLAN_TIMEOUT_MS } from '@constants/billing'
import { BillingTarget, isBillingTargetReached } from '@helpers/plans'
import { reportError } from '@helpers/reportError'

export type AwaitPlanState =
  | { status: 'waiting' }
  /** What was asked for is in force. */
  | { status: 'done'; current: ProviderPlanWithUsage }
  /** Still not applied after a minute — almost always a slow webhook, rarely a lost one. */
  | { status: 'timeout' }

/**
 * Waits for Paddle's webhook to apply a billing change: polls `GET /provider-profile/plan`
 * until **the change asked for** is in force (`isBillingTargetReached`) — a plan, an add-on's
 * quantity, or after a checkout simply a live subscription. Regionify's return page waited
 * for "anything but free", which reported an upgrade between two paid tiers done before the
 * webhook landed.
 *
 * `target` null waits for nothing. `attempt` restarts the wait (a second change on the same
 * screen). A failed poll is reported and retried on the next tick: the payment already went
 * through, and one dropped request must not turn into an error screen.
 */
export const useAwaitPlan = (target: BillingTarget | null, attempt = 0): AwaitPlanState => {
  const [state, setState] = useState<{ key: string; value: AwaitPlanState } | null>(null)
  const key = `${target ? JSON.stringify(target) : ''}:${attempt}`

  useEffect(() => {
    if (!target) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = Date.now() + AWAIT_PLAN_TIMEOUT_MS

    const poll = async (): Promise<void> => {
      try {
        const current = await getProviderPlanAPI()
        if (cancelled) return
        if (isBillingTargetReached(target, current)) {
          setState({ key, value: { status: 'done', current } })
          return
        }
      } catch (error) {
        if (cancelled) return
        reportError(error, 'await plan')
      }
      if (Date.now() >= deadline) {
        setState({ key, value: { status: 'timeout' } })
        return
      }
      timer = setTimeout(() => void poll(), AWAIT_PLAN_POLL_MS)
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
    // `key` is `target` serialised: a new object with the same meaning must not restart the wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Derived, never reset at the top of the effect: a new key is "waiting" until it answers.
  return state?.key === key ? state.value : { status: 'waiting' }
}
