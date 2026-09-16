import type { Request } from 'express'
import { Router } from 'express'
import { config } from '../config.js'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { notifyReviewReported } from '../lib/review-mail.js'
import type { SessionPayload } from '../lib/session.js'
import { mapReview, reviewListInclude } from '../mappers/entities.js'
import { requireAuth, requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { resolvePageWindow } from '../services/providerSearch.js'
import { looksLikeProviderId } from '../services/providerSeo.js'
import {
  distributionFromCounts,
  parseReplyBody,
  parseReportReason,
  parseReviewBody,
  parseReviewsListQuery,
  recomputeProviderRating,
  ReviewValidationError,
} from '../services/reviews.js'

/**
 * Reviews: the public list, the consumer's own write, and the provider's two answers to
 * one — a public reply, or a report to us.
 *
 * Two routers because they hang off two different resources. `providerReviewsRouter`
 * mounts under `/providers`, where a review is a sub-resource of the page it is about;
 * `reviewsRouter` mounts under `/reviews`, where an existing review is addressed by its
 * own id. Both are registered in `app.ts`, which is the only place mounting happens.
 */

export const providerReviewsRouter = Router()
export const reviewsRouter = Router()

/**
 * Five reports an hour per provider.
 *
 * Keyed on the provider id rather than the IP, which is the opposite of what
 * `routes/contact.ts` does and is right here for the opposite reason: this route is
 * authenticated, so there is a stable identity to count against, and that identity is
 * exactly the thing being abused when someone tries to bury a page's reviews under
 * reports. An IP key would let one provider spend everyone else's budget from a shared
 * network, and would reset when they changed networks.
 */
const reportLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 })

/** The route's translation of a parser failure. Keeps the parsers free of Express. */
const parsed = <T>(read: () => T): T => {
  try {
    return read()
  } catch (error) {
    if (error instanceof ReviewValidationError) throw new HttpError(400, error.message, 400)
    throw error
  }
}

/**
 * The caller's Consumer row, or `undefined`.
 *
 * Deliberately **not** `resolveConsumerId` from `routes/appointments.ts`, which creates a
 * Consumer on the fly for a provider who books. Nothing here should ever create one: a
 * reviewer must already hold an appointment, and an appointment already names a Consumer.
 * A session with no Consumer row therefore has no eligible appointment by definition, and
 * conjuring an empty one as a side effect of *reading* a review list would be a write on
 * a GET.
 */
const viewerConsumerId = async (session: SessionPayload | undefined): Promise<string | undefined> => {
  if (!session) return undefined
  if (session.role === 'consumer') return session.profileId

  const consumer = await prisma.consumer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  return consumer?.id
}

/**
 * Resolves the `:id` segment the same way `GET /providers/:id` does — id **or** vanity
 * slug — so the reviews section works on `/p/<slug>` without a second route, and applies
 * the same visibility rule: an unlisted page 404s for everyone but its owner.
 */
const loadProviderForReviews = async (req: Request) => {
  const segment = req.params.id ?? ''
  const provider = await prisma.provider.findUnique({
    where: looksLikeProviderId(segment) ? { id: segment } : { slug: segment.toLowerCase() },
    select: { id: true, listed: true, ratingAvg: true, ratingCount: true },
  })
  if (!provider) throw new HttpError(404, 'Provider not found', 404)

  const isOwner = req.session?.role === 'provider' && req.session.profileId === provider.id
  if (!provider.listed && !isOwner) throw new HttpError(404, 'Provider not found', 404)

  return { ...provider, isOwner }
}

/**
 * What a review section needs, in one request: the page of reviews, the summary the
 * histogram renders, and what *this* viewer may do about it.
 *
 * Bundled rather than split across three endpoints because the provider page is a Server
 * Component — every extra endpoint is another sequential round trip inside the same
 * render, and the summary is three columns the provider row already carries.
 */
providerReviewsRouter.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const provider = await loadProviderForReviews(req)
    const { sort, page: requestedPage, perPage } = parseReviewsListQuery(req.query)

    // Hidden reviews are invisible here, exactly as they are to the aggregate. A
    // moderated review leaves no gap and no "removed" placeholder — that would publish
    // the fact of the complaint, which is the outcome a bad-faith report is fishing for.
    const where = { providerId: provider.id, hiddenAt: null }

    const total = await prisma.review.count({ where })
    const { page, pageCount, skip } = resolvePageWindow(total, requestedPage, perPage)

    const [rows, byRating, consumerId] = await Promise.all([
      prisma.review.findMany({
        where,
        include: reviewListInclude,
        orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: perPage,
      }),
      // Scoped to one provider on their own detail page — not the per-provider aggregate
      // across a whole paged list that `docs/BACKLOG.md` ruled out.
      prisma.review.groupBy({ by: ['rating'], where, _count: true }),
      viewerConsumerId(req.session),
    ])

    /**
     * What this viewer may do. Absent for a signed-out visitor, so the page renders a
     * sign-in prompt instead of a form that would 401 on submit.
     *
     * `eligibleAppointmentId` is the whole eligibility rule in one field: a past,
     * non-cancelled appointment of theirs with this provider that has not been reviewed.
     * The client never evaluates it — it either has an id to submit or it has no CTA.
     */
    const eligible = consumerId
      ? await prisma.appointment.findFirst({
          where: {
            consumerId,
            providerId: provider.id,
            // `endAt < now`, not `status: 'completed'`. Completion is set by hand from the
            // provider's bookings tab and many never set it, so gating on it would make
            // the feature look broken for the providers least likely to chase paperwork.
            endAt: { lt: new Date() },
            status: { not: 'cancelled' },
            review: { is: null },
          },
          orderBy: { endAt: 'desc' },
          select: { id: true },
        })
      : null

    const mine = consumerId
      ? await prisma.review.findFirst({
          where: { providerId: provider.id, consumerId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      : null

    return ok(res, {
      items: rows.map((row) => mapReview(row, consumerId)),
      total,
      page,
      perPage,
      pageCount,
      summary: {
        // Read off the denormalised columns rather than recomputed: they are what the
        // sort orders by, so showing anything else here would mean the page disagreed
        // with the list that led to it.
        average: provider.ratingAvg,
        count: provider.ratingCount,
        distribution: distributionFromCounts(byRating.map((g) => ({ rating: g.rating, count: g._count }))),
      },
      viewer: {
        eligibleAppointmentId: eligible?.id,
        myReviewId: mine?.id,
        /**
         * Answered here rather than by the page asking `/identity/me` and comparing ids
         * itself: this route has already resolved the provider and the session to decide
         * whether an unlisted page is even visible, so the comparison exists. Returning
         * it saves the public page a second round trip inside its own render, and keeps
         * "does this person own this page" a single server-side judgement.
         */
        isProviderOwner: provider.isOwner,
      },
    })
  })
)

/**
 * Leave a review.
 *
 * `requireAuth`, not `requireConsumer` — the same call `POST /appointments` makes, and
 * for the same reason: a role check standing in for an identity check made a signed-in
 * provider a 403 on somebody else's page. Anyone may be a customer. What bounds this is
 * the appointment, not the role.
 */
providerReviewsRouter.post(
  '/:id/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    const provider = await loadProviderForReviews(req)
    const { rating, comment } = parsed(() => parseReviewBody(req.body))

    const consumerId = await viewerConsumerId(req.session)
    if (!consumerId) throw new HttpError(403, 'Only a past client can review this provider', 403)

    const appointmentId = req.body?.appointmentId
    if (typeof appointmentId !== 'string' || !appointmentId) {
      throw new HttpError(400, 'appointmentId is required', 400)
    }

    /**
     * One query proves all four things at once: the appointment exists, it is *theirs*,
     * it is with *this* provider, and it has actually happened. Checking them separately
     * would mean four ways to forget one — and the id comes from the request, so "is it
     * theirs" is the check that makes the rest meaningful.
     */
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        consumerId,
        providerId: provider.id,
        endAt: { lt: new Date() },
        status: { not: 'cancelled' },
      },
      select: { id: true },
    })

    if (!appointment) {
      // One message for "no such appointment", "not yours", "not this provider" and "not
      // finished yet". They all mean the same thing to an honest caller, and telling them
      // apart would turn this into an oracle for whether an appointment id exists.
      throw new HttpError(403, 'You can only review a visit you have already had', 403)
    }

    const review = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { appointmentId: appointment.id },
        select: { id: true },
      })
      // `appointmentId` is `@unique`, so a race here surfaces as P2002 → 409 from the
      // error middleware anyway. This check exists to say *why* in plain words.
      if (existing) throw new HttpError(409, 'You have already reviewed this visit', 409)

      const created = await tx.review.create({
        data: { consumerId, providerId: provider.id, appointmentId: appointment.id, rating, comment },
        include: reviewListInclude,
      })

      // In the same transaction as the write, so a failure cannot leave the review
      // stored and the provider's score stale.
      await recomputeProviderRating(tx, provider.id)
      return created
    })

    return ok(res, mapReview(review, consumerId), 201)
  })
)

/** The caller's own review, or a 404 that does not admit the row exists. */
const loadOwnReview = async (reviewId: string, consumerId: string | undefined) => {
  if (!consumerId) throw new HttpError(404, 'Review not found', 404)

  const review = await prisma.review.findFirst({
    where: { id: reviewId, consumerId },
    select: { id: true, providerId: true },
  })
  if (!review) throw new HttpError(404, 'Review not found', 404)
  return review
}

reviewsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const consumerId = await viewerConsumerId(req.session)
    const existing = await loadOwnReview(req.params.id!, consumerId)
    const { rating, comment } = parsed(() => parseReviewBody(req.body))

    const review = await prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: existing.id },
        // `comment: comment ?? null` rather than leaving it out: an edit that clears the
        // text must clear the column, and an omitted key would silently keep the old
        // sentence under a changed rating.
        data: { rating, comment: comment ?? null },
        include: reviewListInclude,
      })
      if (existing.providerId) await recomputeProviderRating(tx, existing.providerId)
      return updated
    })

    return ok(res, mapReview(review, consumerId))
  })
)

reviewsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const consumerId = await viewerConsumerId(req.session)
    const existing = await loadOwnReview(req.params.id!, consumerId)

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: existing.id } })
      if (existing.providerId) await recomputeProviderRating(tx, existing.providerId)
    })

    return ok(res, true)
  })
)

/**
 * The reviewed provider's own row, proving the caller owns the page this review is on.
 *
 * The provider id comes off the session, never the request, so there is no id to tamper
 * with — the same thing that bounds `GET /provider-profile/bookings`.
 */
const loadReviewOnOwnPage = async (reviewId: string, session: SessionPayload) => {
  const review = await prisma.review.findFirst({
    where: { id: reviewId, providerId: session.profileId },
    include: reviewListInclude,
  })
  if (!review) throw new HttpError(404, 'Review not found', 404)
  return review
}

/** The provider's public answer. One per review, theirs to overwrite. */
reviewsRouter.post(
  '/:id/reply',
  requireProvider,
  asyncHandler(async (req, res) => {
    const review = await loadReviewOnOwnPage(req.params.id!, req.session!)
    const reply = parsed(() => parseReplyBody(req.body))

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: { providerReply: reply, providerRepliedAt: new Date() },
      include: reviewListInclude,
    })

    // No recompute: a reply changes no rating.
    return ok(res, mapReview(updated))
  })
)

/**
 * Report a review for moderation.
 *
 * The row is written first and the email second, because the row is what
 * `/admin/reviews` reads. `notifyReviewReported` returns nothing and never throws for
 * exactly that reason — see its comment.
 */
reviewsRouter.post(
  '/:id/report',
  requireProvider,
  asyncHandler(async (req, res) => {
    const review = await loadReviewOnOwnPage(req.params.id!, req.session!)
    const reason = parsed(() => parseReportReason(req.body))

    /**
     * Counted after validation and after ownership, so a rejected request never spends
     * from the budget — the same ordering `routes/contact.ts` explains at length. The
     * scarce resource is the shared mail quota, which a 400 never touches.
     */
    const verdict = reportLimiter(req.session!.profileId)
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      throw new HttpError(429, 'Too many reports. Please try again later.', 429)
    }

    const open = await prisma.reviewReport.findFirst({
      where: { reviewId: review.id, providerId: req.session!.profileId, status: 'open' },
      select: { id: true },
    })
    // Answered as success rather than as a conflict: the provider's intent is already
    // recorded and re-reporting is not an error they can act on. It just must not queue
    // the same complaint twice or re-send the alert.
    if (open) return ok(res, true)

    const provider = await prisma.provider.findUnique({
      where: { id: req.session!.profileId },
      select: { firstName: true, lastName: true, publicEmail: true },
    })

    const report = await prisma.reviewReport.create({
      data: { reviewId: review.id, providerId: req.session!.profileId, reason },
    })

    await notifyReviewReported({
      reviewId: review.id,
      reportId: report.id,
      providerName: `${provider?.firstName ?? ''} ${provider?.lastName ?? ''}`.trim() || 'A provider',
      providerEmail: provider?.publicEmail ?? undefined,
      reason,
      reviewRating: review.rating,
      reviewComment: review.comment ?? undefined,
      reviewAuthor: mapReview(review).author,
      adminUrl: `${config.corsOrigin}/en/admin/reviews`,
    })

    return ok(res, true)
  })
)
