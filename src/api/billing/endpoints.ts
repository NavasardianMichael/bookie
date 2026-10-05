export const ENDPOINTS = {
  /** Paddle's localized price per paid plan, for this visitor. Public. */
  getPrices: '/billing/prices',
  /** Starts a subscription: answers Paddle's checkout URL. */
  postCheckout: '/billing/checkout',
  /** Moves a live subscription to another plan, prorated. */
  postChangePlan: '/billing/change-plan',
  /** A fresh link into Paddle's customer portal. */
  postPortal: '/billing/portal',
} as const
