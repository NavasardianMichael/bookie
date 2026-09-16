import { escapeHtml, isMailConfigured, sendInternalMail } from './mail.js'
import { config } from '../config.js'

/**
 * The abuse alert a provider's review report sends to the admin inbox.
 *
 * `internal`, not `external`: it reaches us, and `/mail/internal/send` takes no `to` at
 * all — the engine owns the admin address — so there is nothing here anyone could aim.
 *
 * Mirrors `booking-mail.ts`: `mail.ts` stays transport-only, every value that came from a
 * request body is escaped before it reaches HTML, and an unconfigured engine in dev logs
 * instead of sending.
 */

/**
 * **A failed send must not fail the request**, and that is the one thing this module does
 * differently from `routes/contact.ts`.
 *
 * Contact surfaces the failure because nothing is persisted — a dropped send there is a
 * message that simply ceased to exist. A report is a `ReviewReport` row that is already
 * committed by the time this runs, and `/admin/reviews` reads that row, not this email.
 * So the email is the *alert*, the row is the queue, and telling a provider their report
 * failed when it is sitting in the moderation list would be false. Same bargain
 * `booking-mail.ts` makes with a confirmed booking.
 *
 * Returns nothing for that reason: there is no outcome a caller should branch on.
 */
export const notifyReviewReported = async (input: {
  reviewId: string
  reportId: string
  providerName: string
  providerEmail?: string
  reason: string
  reviewRating: number
  reviewComment?: string
  reviewAuthor: string
  adminUrl: string
}): Promise<void> => {
  const summary =
    `Review ${input.reviewId} (${input.reviewRating}★ by ${input.reviewAuthor}) reported by ` +
    `${input.providerName}\n\nReason:\n${input.reason}\n\nReview:\n${input.reviewComment ?? '(rating only)'}`

  if (!isMailConfigured()) {
    /**
     * Unlike the contact form, dev does not `console.log` and production does not 503.
     * The report is stored either way, so an unconfigured engine costs a notification,
     * not a submission — and a 503 here would tell the provider their report was lost
     * when it was not.
     */
    if (config.nodeEnv !== 'production') console.log(`[review-report] ${summary}\n${input.adminUrl}`)
    else console.error('[review-report] Mail engine unconfigured; report stored but not announced')
    return
  }

  const result = await sendInternalMail({
    subject: `Review reported — ${input.providerName}`,
    /**
     * Every interpolated value but `adminUrl` came from a request body or from a
     * provider-authored column, so all of them are escaped. The engine's DOMPurify pass
     * strips scripts and handlers, not an `<a href>` or `<img>` someone typed into a
     * review — which would otherwise render as our own markup inside our own inbox.
     *
     * `adminUrl` is built from our configured origin and a uuid, so no request text
     * reaches that href.
     */
    body:
      `<p><strong>${escapeHtml(input.providerName)}</strong> reported a review on their page.</p>` +
      `<p><strong>Reason</strong><br/><span style="white-space:pre-wrap">${escapeHtml(input.reason)}</span></p>` +
      `<p><strong>The review</strong> — ${input.reviewRating}★ by ${escapeHtml(input.reviewAuthor)}<br/>` +
      `<span style="white-space:pre-wrap">${escapeHtml(input.reviewComment ?? '(rating only, no comment)')}</span></p>` +
      `<p><a href="${input.adminUrl}">Review it in the admin queue</a></p>`,
    senderEmail: input.providerEmail,
    details: { reviewId: input.reviewId, reportId: input.reportId },
  })

  if (!result.ok) {
    // Status and the engine's own message only — never the headers, which carry the key.
    console.error(`[review-report] announce failed: ${result.status} ${result.message}`)
  }
}
