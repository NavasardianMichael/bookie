import { escapeHtml, isMailConfigured, sendExternalMail } from './mail.js'
import { config } from '../config.js'

/** Re-exported for the same reason `booking-mail.ts` re-exports its links: the pinned half lives in `return-path.ts`. */
export { buildPlanUrl, PROVIDER_PLAN_PATH } from './return-path.js'

/**
 * The provider's monthly booking-allowance emails: nearly used up (80%), and used up.
 *
 * `external`, to the provider's own identity address. Best-effort in the way
 * `review-mail.ts` is: the booking that crossed the threshold is already committed (or was
 * already refused), so a failed or unconfigured send costs a notice, never a request — and
 * there is nothing for a caller to branch on, so this returns nothing.
 *
 * **Not gated on `emailNotificationPrefs`.** Once the allowance is spent the provider's
 * page stops taking bookings, and this email is the only way they learn clients are being
 * turned away — the same reasoning that keeps the approval-request email ungated.
 */

type AllowanceNotice = 'warned' | 'reached'

const SUBJECTS: Record<AllowanceNotice, string> = {
  warned: "You have used most of this month's online bookings",
  reached: 'Your page has stopped taking online bookings this month',
}

/** English, like every provider email today: a provider has no locale column to read. */
const formatDay = (date: Date): string =>
  new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(date)

export const sendBookingAllowanceEmail = async (input: {
  to: string
  firstName: string
  notice: AllowanceNotice
  used: number
  limit: number
  /** The first instant of next month — when the allowance resets (UTC). */
  resetsOn: Date
  planUrl: string
}): Promise<void> => {
  const resetsOn = formatDay(input.resetsOn)

  if (!isMailConfigured()) {
    if (config.nodeEnv !== 'production') {
      console.log(`[mail] Booking allowance ${input.notice} ${input.to} (${input.used}/${input.limit})\n${input.planUrl}`)
    } else {
      console.error('[mail] Mail engine unconfigured; booking allowance notice not sent')
    }
    return
  }

  const lead =
    input.notice === 'warned'
      ? `You have taken ${input.used} of the ${input.limit} online bookings your plan includes this month. ` +
        `When they run out, your page stops taking online bookings until ${resetsOn}, and clients who ` +
        `visit it are asked to contact you directly.`
      : `You have taken all ${input.limit} online bookings your plan includes this month, so your page ` +
        `has stopped taking online bookings. Clients who visit it are asked to contact you directly. ` +
        `Online booking opens again on ${resetsOn}, or as soon as your plan is upgraded.`

  const result = await sendExternalMail({
    to: input.to,
    subject: SUBJECTS[input.notice],
    text: `Hi ${input.firstName},\n\n${lead}\n\nSee your plan, or ask for an upgrade:\n\n${input.planUrl}\n`,
    // `firstName` is provider-authored, so it is escaped; `planUrl` is built from our own
    // origin and a fixed path, and the numbers and date are ours.
    html:
      `<p>Hi ${escapeHtml(input.firstName)},</p>` +
      `<p>${lead}</p>` +
      `<p><a href="${input.planUrl}">See your plan, or ask for an upgrade</a></p>`,
  })

  if (!result.ok) {
    // Status and the engine's own message only — never the headers, which carry the key.
    console.error(`[mail] booking allowance ${input.notice} failed: ${result.status} ${result.message}`)
  }
}
