import { type Request, Router } from 'express'
import { config } from '../config.js'
import { ok } from '../lib/api-response.js'
import { buildIcsCalendar, type IcsEvent } from '../lib/ics.js'
import { PLAN_ERROR } from '../lib/plan-errors.js'
import { prisma } from '../lib/prisma.js'
import { calendarFeedTokenMatches, mintCalendarFeedToken } from '../lib/token.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { LIVE_STATUSES } from '../services/appointments.js'
import { getEntitlements } from '../services/plans.js'

/**
 * The provider's private calendar feed — their bookings as an iCal subscription in Google,
 * Apple or Outlook calendar. A paid convenience (`calendarFeed`, Basic and up).
 *
 * The URL is the credential: `/calendar/<providerId>/<token>.ics`, where the token is an HMAC
 * of the provider id and `calendarFeedVersion` (`lib/token.ts`). Nothing is stored, so the
 * provider can always see their URL again, and "reset link" bumps the version to revoke every
 * copy handed out before. It carries the same client details the provider's own bookings list
 * shows them (`GET /provider-profile/bookings`) — no more.
 *
 * Calendar apps cannot send cookies or headers, which is why this is a capability URL rather
 * than an authenticated route — the same trade the booking manage link makes.
 */
export const calendarRouter = Router()

/** Mounted on `/provider-profile`, beside `providerPlanRouter`; no path overlaps. */
export const providerCalendarRouter = Router()

/** How far around today the feed reaches — recent history for context, a year ahead. */
const FEED_PAST_DAYS = 30
const FEED_FUTURE_DAYS = 365
const DAY_MS = 24 * 60 * 60 * 1000

/** Calendar apps poll on their own schedule; this is the hint, and the cache lifetime. */
const FEED_REFRESH_MINUTES = 60

const clientName = (row: {
  guestFirstName: string | null
  guestLastName: string | null
  consumer: { firstName: string; lastName: string } | null
}): string =>
  [row.guestFirstName, row.guestLastName].filter(Boolean).join(' ') ||
  [row.consumer?.firstName, row.consumer?.lastName].filter(Boolean).join(' ') ||
  'Client'

const formatPhone = (code: number | null, number: bigint | null): string | undefined =>
  number ? `${code ? `+${code} ` : ''}${number.toString()}` : undefined

/**
 * The feed's own URL, on **this** host: the feed is served by the API, and the request that
 * asks for it reached the API through the proxy (`trust proxy` makes `req.protocol` honour
 * `X-Forwarded-Proto`).
 */
const feedUrl = (req: Request, providerId: string, version: number): string =>
  `${req.protocol}://${req.get('host')}/calendar/${providerId}/${mintCalendarFeedToken(providerId, version, config.jwtSecret)}.ics`

calendarRouter.get(
  '/:providerId/:file',
  asyncHandler(async (req, res) => {
    const { providerId, file } = req.params
    const token = file?.endsWith('.ics') ? file.slice(0, -'.ics'.length) : ''

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address: true,
        plan: true,
        planExpiresAt: true,
        calendarFeedVersion: true,
      },
    })

    // One answer for a wrong token, an unknown provider and a lapsed plan: a feed URL must
    // not confirm that a provider id exists, and a lapsed one simply stops updating.
    const now = new Date()
    if (
      !provider ||
      !token ||
      !calendarFeedTokenMatches(token, provider.id, provider.calendarFeedVersion, config.jwtSecret) ||
      !getEntitlements(provider, now).calendarFeed
    ) {
      throw new HttpError(404, 'Not found', 404)
    }

    const rows = await prisma.appointment.findMany({
      where: {
        providerId: provider.id,
        status: { in: [...LIVE_STATUSES] },
        startAt: {
          gte: new Date(now.getTime() - FEED_PAST_DAYS * DAY_MS),
          lte: new Date(now.getTime() + FEED_FUTURE_DAYS * DAY_MS),
        },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        notes: true,
        updatedAt: true,
        guestFirstName: true,
        guestLastName: true,
        guestEmail: true,
        guestPhoneCode: true,
        guestPhoneNumber: true,
        service: { select: { name: true } },
        consumer: {
          select: { firstName: true, lastName: true, phoneCode: true, phoneNumber: true, user: { select: { email: true } } },
        },
      },
      orderBy: { startAt: 'asc' },
    })

    const events: IcsEvent[] = rows.map((row) => {
      const phone = row.consumer
        ? formatPhone(row.consumer.phoneCode, row.consumer.phoneNumber)
        : formatPhone(row.guestPhoneCode, row.guestPhoneNumber)
      const email = row.consumer?.user.email ?? row.guestEmail ?? undefined
      const pending = row.status === 'pending'
      return {
        uid: `${row.id}@bookie`,
        start: row.startAt,
        end: row.endAt,
        summary: `${pending ? '[Awaiting approval] ' : ''}${row.service.name} — ${clientName(row)}`,
        description: [phone && `Phone: ${phone}`, email && `Email: ${email}`, row.notes && `Notes: ${row.notes}`]
          .filter(Boolean)
          .join('\n'),
        location: provider.address || undefined,
        status: pending ? 'TENTATIVE' : 'CONFIRMED',
        stamp: row.updatedAt,
      }
    })

    const name = `${provider.firstName} ${provider.lastName}`.trim()
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Cache-Control', `private, max-age=${FEED_REFRESH_MINUTES * 60}`)
    res.send(buildIcsCalendar({ name: `Bookie — ${name}`, refreshMinutes: FEED_REFRESH_MINUTES, events }))
  })
)

const loadFeedOwner = async (providerId: string) => {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, plan: true, planExpiresAt: true, calendarFeedVersion: true },
  })
  if (!provider) throw new HttpError(404, 'Provider profile not found', 404)
  if (!getEntitlements(provider, new Date()).calendarFeed) {
    throw new HttpError(403, 'A calendar feed is not included in your plan', PLAN_ERROR.featureLocked)
  }
  return provider
}

/** The provider's feed URL, to copy into their calendar app. */
providerCalendarRouter.get(
  '/calendar-feed',
  requireProvider,
  asyncHandler(async (req, res) => {
    const provider = await loadFeedOwner(req.session!.profileId)
    return ok(res, { url: feedUrl(req, provider.id, provider.calendarFeedVersion) })
  })
)

/** Revoke the current URL — shared by mistake, or a device lost — and answer the new one. */
providerCalendarRouter.post(
  '/calendar-feed/rotate',
  requireProvider,
  asyncHandler(async (req, res) => {
    const provider = await loadFeedOwner(req.session!.profileId)
    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: { calendarFeedVersion: { increment: 1 } },
      select: { id: true, calendarFeedVersion: true },
    })
    return ok(res, { url: feedUrl(req, updated.id, updated.calendarFeedVersion) })
  })
)
