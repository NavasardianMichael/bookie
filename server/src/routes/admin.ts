import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { mapReviewReport } from '../mappers/entities.js'
import { requireAdmin } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { resolvePageWindow } from '../services/providerSearch.js'
import { recomputeProviderRating } from '../services/reviews.js'

/**
 * The moderation queue — this codebase's first admin surface.
 *
 * It exists because review reports need a reader. `routes/contact.ts` argues against
 * persisting a contact message on the grounds that, with no admin surface, the table
 * would never be looked at; that argument is what this router answers. The report email
 * is the alert, `ReviewReport` is the queue, and these three routes are how it is worked.
 *
 * Every route is behind `requireAdmin`, which matches the caller's identity email against
 * `config.adminEmails` and answers **404** — not 403 — to everyone else, so the surface
 * does not announce itself. An empty allowlist admits nobody.
 */
export const adminRouter = Router()

const REPORTS_PAGE_SIZE = 20

const STATUSES = ['open', 'resolved', 'dismissed'] as const
type ReportStatus = (typeof STATUSES)[number]

const asStatus = (raw: unknown): ReportStatus | undefined =>
  STATUSES.find((status) => status === raw)

const asPositiveInt = (raw: unknown, fallback: number, max: number): number => {
  const parsed = Number.parseInt(typeof raw === 'string' ? raw : '', 10)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

/**
 * The queue. Defaults to `open` because that is the only list with work in it — an
 * unfiltered default would bury today's three reports under every one ever filed.
 */
adminRouter.get(
  '/reviews/reports',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = asStatus(req.query.status) ?? 'open'
    const requestedPage = asPositiveInt(req.query.page, 1, Number.MAX_SAFE_INTEGER)
    const perPage = asPositiveInt(req.query.perPage, REPORTS_PAGE_SIZE, 100)

    const where = { status }
    const total = await prisma.reviewReport.count({ where })
    const { page, pageCount, skip } = resolvePageWindow(total, requestedPage, perPage)

    const reports = await prisma.reviewReport.findMany({
      where,
      include: {
        review: {
          include: {
            consumer: { select: { firstName: true, lastName: true } },
            provider: true,
          },
        },
      },
      // Oldest first: a moderation queue is worked from the front, and the report that
      // has been waiting longest is the one someone is still waiting on.
      orderBy: { createdAt: 'asc' },
      skip,
      take: perPage,
    })

    return ok(res, { items: reports.map(mapReviewReport), total, page, perPage, pageCount })
  })
)

/**
 * Hide or restore a review.
 *
 * A timestamp, never a delete — a report that turns out to be malicious has to be
 * reversible, and the row is the evidence for whichever way the call went. Hiding
 * recomputes the provider's aggregate in the same transaction, because a hidden review
 * counts toward nothing: leaving it in the average would let a review removed for abuse
 * keep doing the damage it was written to do.
 */
adminRouter.patch(
  '/reviews/:id/visibility',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const hidden = req.body?.hidden
    if (typeof hidden !== 'boolean') throw new HttpError(400, '`hidden` must be true or false', 400)

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 300) : undefined

    const review = await prisma.review.findUnique({
      where: { id: req.params.id! },
      select: { id: true, providerId: true },
    })
    if (!review) throw new HttpError(404, 'Review not found', 404)

    await prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: review.id },
        data: {
          hiddenAt: hidden ? new Date() : null,
          // Cleared on restore so a later hide cannot inherit the reason for an earlier
          // one, which would attach the wrong justification to the wrong decision.
          hiddenReason: hidden ? (reason ?? null) : null,
        },
      })
      if (review.providerId) await recomputeProviderRating(tx, review.providerId)
    })

    return ok(res, true)
  })
)

/** Close a report — upheld and acted on, or dismissed. Independent of hide/restore. */
adminRouter.patch(
  '/reviews/reports/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = asStatus(req.body?.status)
    if (!status || status === 'open') {
      throw new HttpError(400, '`status` must be `resolved` or `dismissed`', 400)
    }

    const report = await prisma.reviewReport.findUnique({
      where: { id: req.params.id! },
      select: { id: true },
    })
    if (!report) throw new HttpError(404, 'Report not found', 404)

    await prisma.reviewReport.update({
      where: { id: report.id },
      data: { status, resolvedAt: new Date() },
    })

    return ok(res, true)
  })
)
