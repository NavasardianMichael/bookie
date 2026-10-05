/**
 * What every plan includes, Free too — keys into `Pricing.included.*`, in display order.
 *
 * **Claims only what ships**, the rule the landing page's feature lists follow: each entry
 * was checked against the tree, not the settings UI. Reminders are here because a sender
 * exists (`server/src/jobs/reminderJob.ts`); add nothing that does not.
 */
export const PRICING_INCLUDED = [
  'publicPage',
  'onlineBooking',
  'clientsFree',
  'approvals',
  'emailNotifications',
  'reminders',
  'clientCalendar',
  'reviews',
  'analytics',
  'explore',
  'languages',
] as const

/** Keys into `Pricing.faq.*`, each holding a `q` and an `a`, in display order. */
export const PRICING_FAQ = [
  'clientsPay',
  'cancel',
  'downgrade',
  'switching',
  'paymentProcessor',
  'currency',
  'failedPayment',
  'refunds',
] as const
