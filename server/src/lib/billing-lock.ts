import { createKeyedLock } from './keyed-lock.js'

/**
 * One provider's billing changes, one at a time, keyed on the provider id: each reads the
 * subscription's items from Paddle and writes the whole list back, so two that overlap would
 * undo each other. Shared by `routes/billing.ts` and `jobs/scheduledSwitchJob.ts`, which both
 * change items, so a click and the job cannot interleave either. In-process (`keyed-lock.ts`).
 */
export const billingLock = createKeyedLock()
