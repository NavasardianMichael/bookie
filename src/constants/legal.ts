/**
 * The legal documents' shape — section keys in order, and how many paragraphs each holds.
 * The words are `Legal.<document>.sections.<section>.{title,p1…}` in every catalogue.
 *
 * Paddle approves a site for live payments only once Terms (naming Paddle as Merchant of
 * Record), a Privacy Policy and a Refund Policy are published (docs/PADDLE_SETUP.md). Change
 * a document and its date together.
 */
export const LEGAL_LAST_UPDATED = '2026-10-04'

export type LegalDocumentKey = 'terms' | 'privacy' | 'refund'

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, { intro: boolean; sections: Record<string, number> }> = {
  terms: {
    intro: false,
    sections: {
      acceptance: 1,
      service: 1,
      accounts: 1,
      bookings: 1,
      content: 1,
      acceptableUse: 1,
      plans: 2,
      planChanges: 1,
      intellectualProperty: 1,
      termination: 1,
      disclaimer: 1,
      liability: 1,
      changes: 1,
      contact: 1,
    },
  },
  privacy: {
    intro: true,
    sections: {
      collect: 6,
      use: 1,
      sharing: 6,
      cookies: 1,
      retention: 1,
      rights: 1,
      security: 1,
      children: 1,
      changes: 1,
      contact: 1,
    },
  },
  refund: {
    intro: false,
    sections: {
      subscriptions: 1,
      cancel: 1,
      eligibility: 1,
      planChanges: 1,
      request: 1,
      processing: 1,
      contact: 1,
    },
  },
}
