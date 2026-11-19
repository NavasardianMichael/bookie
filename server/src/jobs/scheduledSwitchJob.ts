import type { Plan } from '@prisma/client'
import { config } from '../config.js'
import { billingLock } from '../lib/billing-lock.js'
import { cancelAtPeriodEnd, getSubscriptionItems, updateSubscriptionItems } from '../lib/paddle.js'
import { prisma } from '../lib/prisma.js'
import {
  itemsForPlan,
  parseSubscriptionItems,
  planPriceId,
  SCHEDULED_SWITCH_LEAD_MS,
  scheduledSwitchStep,
} from '../services/billing.js'
import { isPaidPlan } from '../services/plans.js'

/**
 * Applies a move to a cheaper plan when the period it waited for is ending (docs/BILLING.md →
 * *Moving down*). Paddle cannot schedule an item change — only a cancel or a pause — so
 * `POST /billing/change-plan` stores `scheduledPlan` and this changes the items in the period's
 * last hours, unbilled, for the renewal to charge the cheaper plan.
 *
 * Every few minutes it reads the scheduled moves that are due (or whose subscription ended)
 * and, **under the billing lock**, re-reads the row — a click may have kept the plan or
 * scheduled another — then asks `scheduledSwitchStep` what to do. A move is cleared only by
 * compare-and-set on the values it was applied for, so one rescheduled meanwhile survives.
 * A Paddle failure leaves the row as it is, for the next run.
 *
 * Started by `index.ts` beside the reminder job, never by `createApp`.
 */

const SWEEP_INTERVAL_MS = 5 * 60 * 1000

type Scheduled = { id: string; scheduledPlan: Plan; scheduledPlanAt: Date }

const clear = ({ id, scheduledPlan, scheduledPlanAt }: Scheduled) =>
  prisma.provider.updateMany({
    where: { id, scheduledPlan, scheduledPlanAt },
    data: { scheduledPlan: null, scheduledPlanAt: null },
  })

const applyOne = async (providerId: string, now: Date): Promise<boolean> =>
  billingLock(providerId, async () => {
    const row = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, scheduledPlan: true, scheduledPlanAt: true, paddleSubscriptionId: true, billingStatus: true },
    })
    if (!row?.scheduledPlan || !row.scheduledPlanAt) return false
    const scheduled: Scheduled = { id: row.id, scheduledPlan: row.scheduledPlan, scheduledPlanAt: row.scheduledPlanAt }

    const step = scheduledSwitchStep(row, row.scheduledPlanAt, now)
    if (step === 'wait') return false
    const catalogue = config.paddle.catalogue
    const plan = row.scheduledPlan
    if (step === 'drop' || !row.paddleSubscriptionId || (isPaidPlan(plan) && !planPriceId(catalogue, plan))) {
      await clear(scheduled)
      console.info(`[billing] provider ${row.id}: scheduled switch to ${plan} dropped (${step})`)
      return false
    }

    const subscriptionId = row.paddleSubscriptionId
    const lines = parseSubscriptionItems(await getSubscriptionItems(subscriptionId)).map(({ priceId, quantity }) => ({
      priceId,
      quantity,
    }))
    const { items } = itemsForPlan(lines, plan, catalogue)
    if (items.length) {
      await updateSubscriptionItems(subscriptionId, { items, withdrawCancel: false, unbilled: step === 'apply' })
    } else {
      // Free, and every add-on removed since it was scheduled: what is left is a cancellation.
      await cancelAtPeriodEnd(subscriptionId)
    }
    await clear(scheduled)
    console.info(`[billing] provider ${row.id}: switched to ${plan} as scheduled (${step})`)
    return true
  })

/** One sweep: every scheduled move inside the lead window or past it. Returns how many were applied. */
export const runScheduledSwitches = async (now: Date): Promise<number> => {
  const due = await prisma.provider.findMany({
    where: { scheduledPlan: { not: null }, scheduledPlanAt: { lte: new Date(now.getTime() + SCHEDULED_SWITCH_LEAD_MS) } },
    select: { id: true },
  })

  let applied = 0
  for (const { id } of due) {
    try {
      if (await applyOne(id, now)) applied += 1
    } catch (error) {
      console.error(`[billing] provider ${id}: scheduled switch failed, retrying next sweep`, error)
    }
  }
  return applied
}

/** Starts the sweep; returns a stop function. One sweep at a time — a slow one is not overlapped. */
export const startScheduledSwitchJob = (): (() => void) => {
  let running = false

  const tick = async (): Promise<void> => {
    if (running) return
    running = true
    try {
      await runScheduledSwitches(new Date())
    } catch (error) {
      console.error('[billing] scheduled switch sweep failed', error)
    } finally {
      running = false
    }
  }

  const timer = setInterval(() => void tick(), SWEEP_INTERVAL_MS)
  // Never the reason the process stays alive.
  timer.unref()
  void tick()

  return () => clearInterval(timer)
}
