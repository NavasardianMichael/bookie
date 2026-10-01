import { bookingPeriod, capNoticesDue, getEntitlements } from './plans.js'
import { claimCapNotice, countBookingsThisMonth } from './planUsage.js'
import { config } from '../config.js'
import { buildPlanUrl, sendBookingAllowanceEmail } from '../lib/plan-mail.js'
import { prisma } from '../lib/prisma.js'

/**
 * Sends whichever monthly booking-allowance email is due for this provider, if any.
 *
 * Called after every booking made with a provider **and** after one refused because the
 * allowance was spent. The second call is what covers a plan that lapsed mid-month: the
 * provider drops to a smaller allowance they may already be past, no booking ever crosses
 * the threshold, and without it the page would go quiet with nobody told why.
 *
 * Counts afresh rather than trusting the caller's number, so both paths share one rule
 * (`capNoticesDue`), and claims the stamp before sending, so of two bookings landing
 * together only one sends. Free of charge for uncapped plans: it returns before counting.
 *
 * `locale` is the booker's, as the approval-request email's is — a provider has no locale
 * column yet, and the link's language is the only thing it decides.
 */
export const notifyBookingAllowance = async (providerId: string, locale: string): Promise<void> => {
  const now = new Date()
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      plan: true,
      planExpiresAt: true,
      bookingCapWarnedAt: true,
      bookingCapReachedAt: true,
      firstName: true,
      user: { select: { email: true } },
    },
  })
  if (!provider) return

  const limit = getEntitlements(provider, now).maxBookingsPerMonth
  if (limit === null) return

  const { start, end } = bookingPeriod(now)
  const used = await countBookingsThisMonth(providerId, now)
  const [notice] = capNoticesDue({
    used,
    limit,
    warnedAt: provider.bookingCapWarnedAt,
    reachedAt: provider.bookingCapReachedAt,
    periodStart: start,
  })
  if (!notice || !(await claimCapNotice(providerId, notice, now))) return

  await sendBookingAllowanceEmail({
    to: provider.user.email,
    firstName: provider.firstName,
    notice,
    used,
    limit,
    resetsOn: end,
    planUrl: buildPlanUrl(config.corsOrigin, locale),
  })
}
