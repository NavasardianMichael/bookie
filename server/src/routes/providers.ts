import { Prisma } from '@prisma/client'
import type { Request } from 'express'
import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { config } from '../config.js'
import { ok } from '../lib/api-response.js'
import {
  buildBookingManageUrl,
  buildProviderPageUrl,
  formatBookingWhen,
  resolveBookingLocale,
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
} from '../lib/booking-mail.js'
import { mergeProviderNotificationPrefs } from '../lib/notification-prefs.js'
import { prisma } from '../lib/prisma.js'
import { mintOwnerManageToken } from '../lib/token.js'
import {
  consumerSideBookingInclude,
  mapBasicProvider,
  mapConsumerSideBooking,
  mapProviderBooking,
  mapProviderProfile,
  mapProviderSeo,
  mapService,
  mapSingleProvider,
  providerBookingInclude,
  providerInclude,
  providerListInclude,
  providerProfileInclude,
} from '../mappers/entities.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { getProviderBusyIntervals } from '../services/appointments.js'
import { ANALYTICS_SELECT, buildProviderAnalytics, parseAnalyticsRange } from '../services/providerAnalytics.js'
import {
  asTimeZone,
  countBookingsByDay,
  monthRangeInZone,
  parseConsumerBookingsQuery,
  parseProviderBookingsQuery,
} from '../services/providerBookings.js'
import { parseProvidersListQuery, resolvePageWindow } from '../services/providerSearch.js'
import { looksLikeProviderId, parseProviderSeoBody } from '../services/providerSeo.js'

const upload = multer({ dest: config.uploadDir })

/**
 * How far `GET /providers/:id/busy` will look in one request. The booking grid asks a
 * calendar month at a time, so this is three of them — wide enough that paging ahead
 * never needs a wider call, narrow enough that the route cannot be turned into a scan
 * of a provider's whole history.
 */
const MAX_BUSY_WINDOW_MS = 100 * 24 * 60 * 60 * 1000

/**
 * A nested field that arrives JSON-encoded in a multipart body — which carries only
 * strings — or already parsed in a JSON one. A malformed string is the client's error:
 * the bare `JSON.parse` this replaces threw inside the route and answered 500, and so did
 * a JSON body's array, which `JSON.parse` coerces to `"a,b"` before failing on it.
 */
const readJsonField = <T = unknown>(value: unknown, field: string): T | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'object') return value as T
  if (typeof value !== 'string') return undefined
  try {
    return JSON.parse(value) as T
  } catch {
    throw new HttpError(400, `${field} must be valid JSON`, 400)
  }
}

/**
 * The unpublished-edits overlay. **Deliberately has no `email` key**, and `patch` below is
 * built by explicit per-field assignments rather than by spreading the request body — so an
 * `email` sent to this route cannot reach the draft JSON and reappear at publish time.
 * Do not add one: identity email changes belong to `/identity/change-email/*`.
 */
type ProviderDraft = {
  firstName?: string
  lastName?: string
  description?: string | null
  imageUrl?: string | null
  weekSchedule?: unknown
  available?: boolean
  paymentInfo?: unknown
}

export const providersRouter = Router()

/**
 * The Explore list: searched, filtered, sorted and paged, always `listed: true`.
 *
 * `count` runs before `findMany` because the page number has to be clamped against the
 * real total before it can become a `skip` — otherwise `?page=99` answers with an empty
 * grid and a "1 of 4" pager. The two queries are sequential for that reason and not by
 * oversight.
 */
providersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { where, orderBy, page: requestedPage, perPage } = parseProvidersListQuery(req.query)

    const total = await prisma.provider.count({ where })
    const { page, pageCount, skip } = resolvePageWindow(total, requestedPage, perPage)

    const providers = await prisma.provider.findMany({
      where,
      include: providerListInclude,
      orderBy,
      skip,
      take: perPage,
    })

    return ok(res, {
      items: providers.map((p) => mapBasicProvider(p)),
      total,
      page,
      perPage,
      pageCount,
    })
  })
)

/**
 * Times this provider is already taken, so the public grid can grey them out.
 *
 * Replaces `GET /:id/availability`, which returned a server-built 30-minute slot grid
 * that no client ever called (`docs/BACKLOG.md` #6). A slot is only meaningful once a
 * service duration is known, and that is the visitor's choice — so the server answers
 * the part it owns, which is which intervals are gone, and the client subtracts them
 * from the grid it steps itself.
 *
 * Public, and deliberately says nothing but instants — no id, service or booker. It
 * discloses only what the rendered grid already shows.
 */
providersRouter.get(
  '/:id/busy',
  asyncHandler(async (req, res) => {
    const from = new Date(String(req.query.from ?? ''))
    const to = new Date(String(req.query.to ?? ''))
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new HttpError(400, 'from and to must be ISO timestamps', 400)
    }
    // A window, not an open-ended scan: the grid asks a month at a time, and an
    // unbounded range on a public route is a free full-table read of one provider.
    if (to <= from || to.getTime() - from.getTime() > MAX_BUSY_WINDOW_MS) {
      throw new HttpError(400, 'from and to must bound a window of 100 days or less', 400)
    }

    /**
     * The same unlisted rule `GET /providers/:id` enforces, and for the same reason: an
     * unlisted page 404s for everyone but its owner, so nothing legitimate asks this of
     * one. Without the check, a provider who unpublished their page would still be
     * answering questions about when they are booked to anyone holding the id.
     */
    const provider = await prisma.provider.findUnique({
      where: { id: req.params.id },
      select: { id: true, listed: true },
    })
    const isOwner = req.session?.role === 'provider' && req.session.profileId === provider?.id
    if (!provider || (!provider.listed && !isOwner)) {
      throw new HttpError(404, 'Provider not found', 404)
    }

    return ok(res, await getProviderBusyIntervals(provider.id, from, to))
  })
)

/**
 * A provider by id **or** by vanity slug.
 *
 * One endpoint for both so `/p/<slug>` can resolve without a second route. The two
 * namespaces cannot collide: a slug is refused if it is UUID-shaped
 * (`services/providerSeo.ts`), so the segment's shape decides which column to read and
 * each lookup stays a single unique-index hit rather than an `OR` across two.
 */
providersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const segment = req.params.id ?? ''
    const provider = await prisma.provider.findUnique({
      where: looksLikeProviderId(segment) ? { id: segment } : { slug: segment.toLowerCase() },
      include: providerInclude,
    })
    if (!provider) throw new HttpError(404, 'Provider not found', 404)

    // Unlisted providers 404 for everyone except the owner (Preview Profile).
    const isOwner =
      req.session?.role === 'provider' && req.session.profileId === provider.id
    if (!provider.listed && !isOwner) {
      throw new HttpError(404, 'Provider not found', 404)
    }

    return ok(res, mapSingleProvider(provider))
  })
)

export const providerProfileRouter = Router()

providerProfileRouter.get(
  '/',
  requireProvider,
  asyncHandler(async (req, res) => {
    const provider = await prisma.provider.findUnique({
      where: { id: req.session!.profileId },
      include: providerProfileInclude,
    })
    if (!provider) throw new HttpError(404, 'Provider profile not found', 404)

    const mapped = mapProviderProfile(provider)
    return ok(res, {
      ...mapped,
      listed: provider.listed,
      draft: provider.draft ?? null,
      details: {
        // `email` and `emailVerifiedAt` now come from `mapProviderProfile`, which reads
        // them off the `User` relation. They used to be spliced on here, past the mapper,
        // which is why the public and owner payloads disagreed about whether `details`
        // carried them.
        ...mapped.details,
        emailNotificationPrefs: mergeProviderNotificationPrefs(provider.emailNotificationPrefs),
        paymentInfo: provider.paymentInfo ?? undefined,
      },
    })
  })
)

/**
 * Body modes:
 * - `mode: 'draft'` — merge fields into `Provider.draft` (no public effect)
 * - `mode: 'publish'` — apply draft (or body fields) to live columns and clear draft
 * - `mode: 'listing'` — set `listed` only
 * - omitted / legacy — live update (onboarding formik path + prefs/payment without draft)
 */
providerProfileRouter.put(
  '/',
  requireProvider,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
  ]),
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const body = req.body as Record<string, string | undefined>
    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    const mode = body.mode

    const imageFile = files?.image?.[0]
    const imageUrl = imageFile ? `/uploads/${path.basename(imageFile.path)}` : undefined

    const parseJson = <T>(raw: string | undefined): T | undefined => {
      if (!raw) return undefined
      try {
        return JSON.parse(raw) as T
      } catch {
        return undefined
      }
    }

    if (mode === 'listing') {
      const listedValue =
        typeof req.body?.listed === 'boolean'
          ? req.body.listed
          : body.listed === 'true' || body.listed === '1'

      const provider = await prisma.provider.update({
        where: { id: providerId },
        data: { listed: listedValue },
        include: providerProfileInclude,
      })
      return ok(res, {
        ...mapProviderProfile(provider),
        listed: provider.listed,
        draft: provider.draft ?? null,
      })
    }

    if (mode === 'draft' || mode === 'publish') {
      const existing = await prisma.provider.findUnique({ where: { id: providerId } })
      if (!existing) throw new HttpError(404, 'Provider profile not found', 404)

      const weekScheduleRaw = body.weekSchedule ?? body.WeekSchedule ?? req.body?.weekSchedule
      const weekSchedule = readJsonField(weekScheduleRaw, 'weekSchedule')
      const paymentInfo =
        parseJson(typeof body.paymentInfo === 'string' ? body.paymentInfo : undefined) ??
        (typeof req.body?.paymentInfo === 'object' ? req.body.paymentInfo : undefined)
      const availableRaw = body.available ?? req.body?.available
      const available =
        availableRaw === undefined
          ? undefined
          : availableRaw === true || availableRaw === 'true' || availableRaw === '1'

      const patch: ProviderDraft = {
        ...(typeof existing.draft === 'object' && existing.draft ? (existing.draft as ProviderDraft) : {}),
      }
      if (body.firstName ?? body.FirstName) patch.firstName = body.firstName ?? body.FirstName
      if (body.lastName ?? body.LastName) patch.lastName = body.lastName ?? body.LastName
      if (body.description !== undefined || body.Description !== undefined) {
        patch.description = (body.description ?? body.Description) || null
      }
      if (imageUrl) patch.imageUrl = imageUrl
      if (weekSchedule) patch.weekSchedule = weekSchedule
      if (available !== undefined) patch.available = available
      if (paymentInfo !== undefined) patch.paymentInfo = paymentInfo

      if (mode === 'draft') {
        const provider = await prisma.provider.update({
          where: { id: providerId },
          data: { draft: patch as Prisma.InputJsonValue },
          include: providerProfileInclude,
        })
        return ok(res, {
          ...mapProviderProfile(provider),
          listed: provider.listed,
          draft: provider.draft ?? null,
        })
      }

      // publish: apply draft overlay onto live columns
      const provider = await prisma.provider.update({
        where: { id: providerId },
        data: {
          firstName: patch.firstName ?? existing.firstName,
          lastName: patch.lastName ?? existing.lastName,
          description: patch.description === undefined ? existing.description : patch.description,
          imageUrl: patch.imageUrl === undefined ? existing.imageUrl : patch.imageUrl,
          weekSchedule: (patch.weekSchedule as object | undefined) ?? existing.weekSchedule ?? undefined,
          available: patch.available ?? existing.available,
          paymentInfo:
            patch.paymentInfo === undefined
              ? (existing.paymentInfo ?? Prisma.DbNull)
              : (patch.paymentInfo as Prisma.InputJsonValue),
          // `Prisma.DbNull` writes SQL NULL. A bare `null` is rejected for a nullable Json
          // column, because Prisma cannot tell it from the JSON value `null`.
          draft: Prisma.DbNull,
        },
        include: providerProfileInclude,
      })
      return ok(res, {
        ...mapProviderProfile(provider),
        listed: provider.listed,
        draft: null,
      })
    }

    // Legacy / direct live update (onboarding + settings prefs that are not draftable)
    const categoryIdsRaw = body.categoryIds ?? body.CategoryIds
    const categoryIds = readJsonField<string[]>(categoryIdsRaw, 'categoryIds')
    const weekScheduleRaw = body.weekSchedule ?? body.WeekSchedule
    const weekSchedule = readJsonField(weekScheduleRaw, 'weekSchedule')
    const emailNotificationPrefs =
      parseJson(body.emailNotificationPrefs) ?? req.body?.emailNotificationPrefs
    /**
     * Saved **live**, never into the draft overlay, for the same reason the vanity slug
     * is: the draft exists so a provider can rework the *visible* page without shipping
     * it half-finished, and this changes nothing anyone sees. Staging it behind Publish
     * would mean a provider who switched approval on, saved a draft, and walked away
     * kept taking auto-confirmed bookings they believed they were reviewing.
     */
    const requiresApprovalRaw = body.requiresBookingApproval ?? req.body?.requiresBookingApproval
    const requiresBookingApproval =
      requiresApprovalRaw === undefined
        ? undefined
        : requiresApprovalRaw === true || requiresApprovalRaw === 'true' || requiresApprovalRaw === '1'
    const paymentInfo = parseJson(body.paymentInfo) ?? req.body?.paymentInfo
    const availableRaw = body.available ?? req.body?.available
    const available =
      availableRaw === undefined
        ? undefined
        : availableRaw === true || availableRaw === 'true' || availableRaw === '1'

    await prisma.provider.update({
      where: { id: providerId },
      data: {
        firstName: body.firstName ?? body.FirstName,
        lastName: body.lastName ?? body.LastName,
        description: body.description ?? body.Description,
        /**
         * **`publicEmail`, never the identity email.**
         *
         * This line used to write `email` — the login identifier — straight from a
         * multipart body with no verification. That was an account-takeover vector: set
         * your email to a victim's address, then request a password reset and receive it.
         *
         * `publicEmail` is the published contact address the profile page and the JSON-LD
         * render. Nothing authenticates against it, so writing it unverified is harmless.
         * The identity email changes only through `/identity/change-email/send` +
         * `/confirm`, which require the current password and a verified click on the new
         * address.
         */
        publicEmail: body.publicEmail ?? body.PublicEmail,
        address: body.address ?? body.Address,
        locationUrl: body.locationURL ?? body.LocationURL,
        organizationId: body.organizationId ?? body.OrganizationId ?? undefined,
        weekSchedule: weekSchedule ?? undefined,
        imageUrl: imageUrl ?? undefined,
        available: available ?? undefined,
        emailNotificationPrefs:
          emailNotificationPrefs === undefined
            ? undefined
            : mergeProviderNotificationPrefs(emailNotificationPrefs),
        requiresBookingApproval,
        paymentInfo: paymentInfo === undefined ? undefined : paymentInfo,
        ...(categoryIds
          ? {
              categories: {
                deleteMany: {},
                create: categoryIds.map((categoryId) => ({ categoryId })),
              },
            }
          : {}),
      },
    })

    if (files?.gallery?.length) {
      await prisma.providerGallery.createMany({
        data: files.gallery.map((f) => ({
          providerId,
          name: f.originalname,
          url: `/uploads/${path.basename(f.path)}`,
        })),
      })
    }

    const updated = await prisma.provider.findUnique({
      where: { id: providerId },
      include: providerProfileInclude,
    })

    return ok(res, {
      ...mapProviderProfile(updated!),
      listed: updated!.listed,
      draft: updated!.draft ?? null,
    })
  })
)

/**
 * Permanently removes the caller's public page. Appointments are a required FK
 * with no `onDelete`, so a page with booking history is a 409 — same as services.
 * The User row is kept when a Consumer profile still points at it.
 */
providerProfileRouter.delete(
  '/',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const userId = req.session!.userId

    const booked = await prisma.appointment.count({ where: { providerId } })
    if (booked) {
      throw new HttpError(409, 'This page has appointments booked and cannot be deleted', 409)
    }

    const consumer = await prisma.consumer.findUnique({ where: { userId }, select: { id: true } })

    await prisma.$transaction(async (tx) => {
      await tx.provider.delete({ where: { id: providerId } })
      if (!consumer) {
        await tx.user.delete({ where: { id: userId } })
      }
    })

    return ok(res, true)
  })
)

/* ------------------------------------------------------------------ *
 * Workspace reads — a provider's own bookings and the numbers over them.
 *
 * These sit on `providerProfileRouter` rather than extending `GET /appointments`
 * deliberately. That route answers "what is coming up" for whoever is asking and is
 * consumed by two existing clients; adding a page window to it would change its
 * response from an array to an envelope and break both. It also picks its `where` off
 * the session *role*, so a provider who booked someone else would never see that row
 * there — `/consumer-bookings` is the read for that side.
 *
 * Here the provider id (and, on the consumer-side pair, the User's Consumer id)
 * comes off the session and is never a parameter, so there is no id to verify and
 * no way to aim these at another person's calendar.
 * ------------------------------------------------------------------ */

providerProfileRouter.get(
  '/bookings',
  requireProvider,
  asyncHandler(async (req, res) => {
    const { where, orderBy, page: requestedPage, perPage } = parseProviderBookingsQuery(
      req.session!.profileId,
      req.query
    )

    // Counted before the page is read, for the same reason as Explore: the requested
    // page has to be clamped against the real total before it can become a `skip`,
    // or `?page=99` answers with an empty list and a "1 of 4" pager.
    const total = await prisma.appointment.count({ where })
    const { page, pageCount, skip } = resolvePageWindow(total, requestedPage, perPage)

    const bookings = await prisma.appointment.findMany({
      where,
      include: providerBookingInclude,
      orderBy,
      skip,
      take: perPage,
    })

    return ok(res, {
      items: bookings.map(mapProviderBooking),
      total,
      page,
      perPage,
      pageCount,
    })
  })
)

/**
 * Booking counts per day for one month, keyed `YYYY-MM-DD` in the caller's timezone —
 * the same key the client's calendar grid uses for its cells, so the badges are a
 * direct lookup with no date parsing on either side.
 *
 * The month is bounded in that timezone rather than UTC: for a provider east of
 * Greenwich the first hours of the 1st are still the previous month in UTC, and those
 * bookings would be missing from the grid whose job is to show them.
 */
providerProfileRouter.get(
  '/bookings/calendar',
  requireProvider,
  asyncHandler(async (req, res) => {
    const timeZone = asTimeZone(req.query.tz)
    const month = typeof req.query.month === 'string' ? req.query.month : ''
    const range = monthRangeInZone(month, timeZone)
    if (!range) throw new HttpError(400, 'month must be YYYY-MM', 400)

    const bookings = await prisma.appointment.findMany({
      where: {
        providerId: req.session!.profileId,
        startAt: { gte: range.start, lt: range.end },
      },
      select: { startAt: true, status: true },
    })

    return ok(res, { month, timeZone, days: countBookingsByDay(bookings, timeZone) })
  })
)

/**
 * Appointments this provider booked *as a client*. Empty when the User has no
 * Consumer row yet — this is a read, so it must not create one. `resolveConsumerId`
 * already does that at book time.
 */
const findConsumerIdForUser = async (userId: string): Promise<string | null> => {
  const consumer = await prisma.consumer.findUnique({ where: { userId }, select: { id: true } })
  return consumer?.id ?? null
}

providerProfileRouter.get(
  '/consumer-bookings',
  requireProvider,
  asyncHandler(async (req, res) => {
    const consumerId = await findConsumerIdForUser(req.session!.userId)
    const { where, orderBy, page: requestedPage, perPage } = parseConsumerBookingsQuery(
      consumerId ?? '',
      req.query
    )

    if (!consumerId) {
      return ok(res, { items: [], total: 0, page: 1, perPage, pageCount: 0 })
    }

    const total = await prisma.appointment.count({ where })
    const { page, pageCount, skip } = resolvePageWindow(total, requestedPage, perPage)

    const bookings = await prisma.appointment.findMany({
      where,
      include: consumerSideBookingInclude,
      orderBy,
      skip,
      take: perPage,
    })

    return ok(res, {
      items: bookings.map(mapConsumerSideBooking),
      total,
      page,
      perPage,
      pageCount,
    })
  })
)

providerProfileRouter.get(
  '/consumer-bookings/calendar',
  requireProvider,
  asyncHandler(async (req, res) => {
    const timeZone = asTimeZone(req.query.tz)
    const month = typeof req.query.month === 'string' ? req.query.month : ''
    const range = monthRangeInZone(month, timeZone)
    if (!range) throw new HttpError(400, 'month must be YYYY-MM', 400)

    const consumerId = await findConsumerIdForUser(req.session!.userId)
    if (!consumerId) {
      return ok(res, { month, timeZone, days: {} })
    }

    const bookings = await prisma.appointment.findMany({
      where: {
        consumerId,
        startAt: { gte: range.start, lt: range.end },
      },
      select: { startAt: true, status: true },
    })

    return ok(res, { month, timeZone, days: countBookingsByDay(bookings, timeZone) })
  })
)

/**
 * Tells the booker what was decided. Reads the row rather than taking the caller's word
 * for who it is about, exactly as the create-time notices do.
 *
 * The approved link is an **owner** manage token — `mintOwnerManageToken`, an HMAC over
 * the appointment id — because the raw emailed token is never persisted and cannot be
 * recovered here. That is safe precisely because of where it is going: the address on
 * the booking, which is the owner's. It must not be minted anywhere a provider could
 * read it back.
 *
 * A decline carries no manage link at all — the row is cancelled, so there is nothing
 * left to manage — and no reason, because the provider is never asked for one and
 * inventing "unavailable" would put words in their mouth.
 */
const notifyBookingDecision = async (
  appointmentId: string,
  decision: 'approve' | 'reject',
  locale: string
): Promise<void> => {
  const row = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      startAt: true,
      providerId: true,
      guestEmail: true,
      guestFirstName: true,
      service: { select: { name: true } },
      consumer: { select: { firstName: true, user: { select: { email: true } } } },
      provider: { select: { firstName: true, lastName: true } },
    },
  })
  if (!row) return

  // A guest may have booked with a phone and no address. There is nobody to email;
  // the provider still has the decision recorded, and the phone number to call.
  const to = row.guestEmail ?? row.consumer?.user.email
  if (!to) return

  const shared = {
    to,
    firstName: row.guestFirstName ?? row.consumer?.firstName ?? 'there',
    providerName: `${row.provider.firstName} ${row.provider.lastName}`.trim() || 'your provider',
    serviceName: row.service.name,
    when: formatBookingWhen(row.startAt),
  }

  if (decision === 'approve') {
    await sendBookingApprovedEmail({
      ...shared,
      manageUrl: buildBookingManageUrl(
        config.corsOrigin,
        locale,
        mintOwnerManageToken(appointmentId, config.jwtSecret)
      ),
    })
    return
  }

  await sendBookingRejectedEmail({
    ...shared,
    bookingUrl: buildProviderPageUrl(config.corsOrigin, locale, row.providerId),
  })
}

/**
 * Approve or decline one booking that is waiting on this provider.
 *
 * A route of its own rather than another status on `PATCH /appointments/:id`, because
 * three things here are not true of that one:
 *
 * - **It is a state machine, not a status write.** Only `pending` is a legal starting
 *   point. Re-posting a decision on a booking already decided must not re-send the
 *   email — approving twice would tell a client twice that they are confirmed, and the
 *   second one would arrive after they had maybe already cancelled.
 * - **It sends mail**, and which message depends on the decision.
 * - **It is scoped by the session's `profileId`**, never a body field, so there is no
 *   id to aim at another provider's queue. `PATCH /appointments/:id` resolves ownership
 *   from the row and serves both sides of a booking; this serves one.
 *
 * A failed send does not fail the request: the decision is committed and the approvals
 * tab has already moved on, so there is no outcome the caller should branch on. Same
 * bargain `lib/booking-mail.ts` makes everywhere else — see `server/CLAUDE.md`.
 */
providerProfileRouter.patch(
  '/bookings/:id/decision',
  requireProvider,
  asyncHandler(async (req, res) => {
    const decision = req.body?.decision
    if (decision !== 'approve' && decision !== 'reject') {
      throw new HttpError(400, "decision must be 'approve' or 'reject'", 400)
    }

    const booking = await prisma.appointment.findFirst({
      where: { id: req.params.id, providerId: req.session!.profileId },
      include: providerBookingInclude,
    })
    // 404 rather than 403 on someone else's booking: the id is a uuid, and confirming
    // that one exists is the first useful thing to learn before guessing at more.
    if (!booking) throw new HttpError(404, 'Booking not found', 404)

    if (booking.status !== 'pending') {
      throw new HttpError(409, 'This booking has already been decided', 409)
    }

    /**
     * A slot that has come and gone cannot be approved — "all that stuff works if it is
     * upcoming". Declining one still can, and must: that is how a request nobody got to
     * in time leaves the queue, and the client is told rather than left wondering.
     */
    if (decision === 'approve' && booking.startAt.getTime() <= Date.now()) {
      throw new HttpError(409, 'This time has already passed. Decline it and offer another.', 409)
    }

    const updated = await prisma.appointment.update({
      where: { id: booking.id },
      // Approving writes `scheduled`, which is exactly the row an auto-approving
      // provider would have had — there is one "on the calendar" state, not two.
      data: { status: decision === 'approve' ? 'scheduled' : 'cancelled' },
      include: providerBookingInclude,
    })

    try {
      await notifyBookingDecision(booking.id, decision, resolveBookingLocale(req.body?.locale))
    } catch (error) {
      console.error('[mail] booking decision notify failed', error)
    }

    return ok(res, mapProviderBooking(updated))
  })
)

providerProfileRouter.get(
  '/analytics',
  requireProvider,
  asyncHandler(async (req, res) => {
    const timeZone = asTimeZone(req.query.tz)
    const range = parseAnalyticsRange(req.query, new Date())
    const providerId = req.session!.profileId

    // Two reads rather than one over the union: the previous window feeds only the
    // delta on each tile, so it is fetched with the same narrow select and bucketed by
    // the same code instead of being special-cased inside one pass.
    //
    // No `lte: range.to` on the current window: a preset is how far back to look, and
    // upcoming bookings after now still belong on this dashboard. All (`unbounded`)
    // drops the lower bound too. Previous-period deltas stay a past-only comparison.
    const [rows, previousRows] = await Promise.all([
      prisma.appointment.findMany({
        where: range.unbounded ? { providerId } : { providerId, startAt: { gte: range.from } },
        select: ANALYTICS_SELECT,
      }),
      range.unbounded
        ? Promise.resolve([])
        : prisma.appointment.findMany({
            where: { providerId, startAt: { gte: range.previousFrom, lt: range.from } },
            select: ANALYTICS_SELECT,
          }),
    ])

    return ok(res, buildProviderAnalytics(rows, previousRows, range, timeZone))
  })
)

/**
 * Search metadata and the vanity slug.
 *
 * A `PATCH` rather than another `mode` on `PUT /provider-profile`: that handler is a
 * multipart form reader with three body modes already, and these are title, description
 * and slug with their own validation rules.
 *
 * The slug saves **live**, not into the draft overlay the other public fields use. A
 * slug is an address rather than content — staging an address change behind a publish
 * button is how someone ends up with a link they believe they changed.
 */
providerProfileRouter.patch(
  '/seo',
  requireProvider,
  asyncHandler(async (req, res) => {
    const data = parseProviderSeoBody(req.body)
    if (!Object.keys(data).length) throw new HttpError(400, 'Nothing to update', 400)

    try {
      const provider = await prisma.provider.update({
        where: { id: req.session!.profileId },
        data,
        include: providerInclude,
      })
      return ok(res, mapProviderSeo(provider))
    } catch (error) {
      // Two providers can pass slug validation at the same instant; only the unique
      // index settles it. `errorHandler` maps P2002 to a generic 409, so it is caught
      // here to say *which* field collided.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'That link is already taken. Please choose another.', 409)
      }
      throw error
    }
  })
)

/* ------------------------------------------------------------------ *
 * Services — a provider's own catalogue.
 *
 * The `:providerId` segment is redundant with the session, but it is the documented
 * route shape (docs/DATABASE_STRUCTURE.md), so it is verified rather than trusted.
 * ------------------------------------------------------------------ */

/** The path id must be the caller's own; a mismatch is a client bug or an attempt. */
function assertOwnProvider(req: Request): string {
  const providerId = req.params.providerId
  if (!providerId) throw new HttpError(400, 'Provider id is required')
  if (req.session!.profileId !== providerId) {
    throw new HttpError(403, 'Cannot modify another provider', 403)
  }
  return providerId
}

const hasField = (body: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(body, key)

/**
 * A service body arrives as JSON, or — when the form carries a cropped image — as
 * multipart text fields, where every value is a string. So both readers coerce, and
 * both distinguish three states: absent (`undefined`, leave the column alone),
 * cleared (`null`), and set.
 */
function readText(body: Record<string, unknown>, key: string): string | null | undefined {
  if (!hasField(body, key)) return undefined
  const raw = body[key]
  if (raw === null) return null
  const trimmed = String(raw).trim()
  return trimmed.length ? trimmed : null
}

function readNumber(body: Record<string, unknown>, key: string): number | null | undefined {
  if (!hasField(body, key)) return undefined
  const raw = body[key]
  if (raw === null || raw === '') return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) throw new HttpError(400, `${key} must be a number`)
  return parsed
}

function readBoolean(body: Record<string, unknown>, key: string): boolean | undefined {
  if (!hasField(body, key)) return undefined
  const raw = body[key]
  return raw === true || raw === 'true' || raw === '1'
}

const uploadedImageUrl = (req: Request): string | undefined =>
  req.file ? `/uploads/${path.basename(req.file.path)}` : undefined

function assertDuration(duration: number): void {
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new HttpError(400, 'Duration must be a positive whole number of minutes')
  }
}

function assertPrice(price: number | null | undefined): void {
  if (price !== undefined && price !== null && price < 0) {
    throw new HttpError(400, 'Price must be a positive number')
  }
}

const CATEGORY_NAME_MAX = 40

/**
 * Resolves the service form's Category field, which is a combobox: an id means an
 * existing (usually predefined) category was picked, a bare name means the provider
 * typed one that may not exist yet. Matching is case-insensitive so "Hair" and "hair"
 * do not become two Category rows. New names become Category rows; they are not
 * auto-linked onto the provider or organization.
 *
 * Three states, matching the rest of this body: `undefined` means the field was
 * absent (leave the column alone), `null` means it was sent empty (clear it), a
 * string is the resolved id. Category is optional — a service is valid with a
 * title and a duration.
 */
async function resolveServiceCategoryId(
  body: Record<string, unknown>
): Promise<string | null | undefined> {
  const categoryId = readText(body, 'categoryId')
  if (categoryId) {
    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  const categoryName = readText(body, 'categoryName')
  if (categoryName) {
    if (categoryName.length > CATEGORY_NAME_MAX) {
      throw new HttpError(400, `Category name must be at most ${CATEGORY_NAME_MAX} characters`)
    }

    const matched = await prisma.category.findFirst({
      where: { name: { equals: categoryName, mode: 'insensitive' } },
      select: { id: true },
    })
    if (matched) return matched.id

    try {
      const created = await prisma.category.create({ data: { name: categoryName } })
      return created.id
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await prisma.category.findFirst({
          where: { name: { equals: categoryName, mode: 'insensitive' } },
          select: { id: true },
        })
        if (raced) return raced.id
      }
      throw error
    }
  }

  if (hasField(body, 'categoryId') || hasField(body, 'categoryName')) return null
  return undefined
}

/** Scoped by `providerId` so one provider can never address another's service. */
async function findOwnService(providerId: string, serviceId: string | undefined): Promise<string> {
  if (!serviceId) throw new HttpError(400, 'Service id is required')
  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId },
    select: { id: true },
  })
  if (!service) throw new HttpError(404, 'Service not found', 404)
  return service.id
}

providersRouter.post(
  '/:providerId/services',
  requireProvider,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const providerId = assertOwnProvider(req)
    const body = req.body as Record<string, unknown>

    const name = readText(body, 'name')
    const categoryId = await resolveServiceCategoryId(body)
    const duration = readNumber(body, 'duration')
    const price = readNumber(body, 'price')

    if (!name) throw new HttpError(400, 'Service name is required')
    if (duration === undefined || duration === null) throw new HttpError(400, 'Service duration is required')
    assertDuration(duration)
    assertPrice(price)

    const service = await prisma.service.create({
      data: {
        providerId,
        name,
        categoryId: categoryId ?? null,
        durationMinutes: duration,
        description: readText(body, 'description') ?? null,
        price: price ?? null,
        currency: readText(body, 'currency') ?? null,
        imageUrl: uploadedImageUrl(req) ?? null,
        active: readBoolean(body, 'active') ?? true,
      },
    })

    return ok(res, mapService(service), 201)
  })
)

providersRouter.put(
  '/:providerId/services/:serviceId',
  requireProvider,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const providerId = assertOwnProvider(req)
    const serviceId = await findOwnService(providerId, req.params.serviceId)
    const body = req.body as Record<string, unknown>

    const name = readText(body, 'name')
    if (hasField(body, 'name') && !name) throw new HttpError(400, 'Service name is required')

    const categoryId = await resolveServiceCategoryId(body)
    const active = readBoolean(body, 'active')

    const duration = readNumber(body, 'duration')
    if (duration !== undefined) {
      if (duration === null) throw new HttpError(400, 'Service duration is required')
      assertDuration(duration)
    }

    const price = readNumber(body, 'price')
    assertPrice(price)

    const imageUrl = uploadedImageUrl(req)

    // Each column is written only when the payload carried its field. `durationMinutes`
    // used to fall back to `Number(undefined ?? 30)`, so saving a service without
    // re-entering its duration silently shortened it to 30 minutes.
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(name ? { name } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(duration !== undefined && duration !== null ? { durationMinutes: duration } : {}),
        ...(hasField(body, 'description') ? { description: readText(body, 'description') } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(hasField(body, 'currency') ? { currency: readText(body, 'currency') } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    })

    return ok(res, mapService(service))
  })
)

providersRouter.delete(
  '/:providerId/services/:serviceId',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = assertOwnProvider(req)
    const serviceId = await findOwnService(providerId, req.params.serviceId)

    // `Appointment.serviceId` is a required FK with no `onDelete`, so Postgres would
    // reject this with a P2003 the error handler renders as a bare 500. Answer the
    // real question instead: the service has history and cannot be removed.
    const booked = await prisma.appointment.count({ where: { serviceId } })
    if (booked) {
      throw new HttpError(409, 'This service has appointments booked and cannot be deleted', 409)
    }

    await prisma.service.delete({ where: { id: serviceId } })
    return ok(res, true)
  })
)
