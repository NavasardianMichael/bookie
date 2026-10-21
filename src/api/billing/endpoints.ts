export const ENDPOINTS = {
  /** Paddle's localized price per paid plan and per add-on, for this visitor. Public. */
  getPrices: '/billing/prices',
  /** Starts a subscription for a plan, add-ons, or both: answers Paddle's checkout URL. */
  postCheckout: '/billing/checkout',
  /** Moves a live subscription to another plan, prorated, dropping the add-ons it includes. */
  postChangePlan: '/billing/change-plan',
  /** Sets how many of one add-on a live subscription holds, prorated; 0 removes it. */
  postAddon: '/billing/addon',
  /** A fresh link into Paddle's customer portal. */
  postPortal: '/billing/portal',
  /** Charges this provider has already paid to Bookie. */
  getPayments: '/billing/payments',
} as const
