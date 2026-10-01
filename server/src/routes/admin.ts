import type { Prisma } from '@prisma/client'
import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { asBoundedString } from '../lib/request.js'
import { mapAdminProvider, mapReviewReport } from '../mappers/entities.js'
import { requireAdmin } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { effectivePlan, parseAdminPlanBody } from '../services/plans.js'
import { resolvePageWindow } from '../services/providerSearch.js'
import { recomputeProviderRating } from '../services/reviews.js'

/**
 * The admin surface: the review moderation queue, and provider plan assignment.
 *
 * Moderation exists because review reports need a reader. `routes/contact.ts` argues
 * against persisting a contact message on the grounds that, with no admin surface, the
 * table would never be looked at; that argument is what this router answers. The report
 * email is the alert, `ReviewReport` is the queue, and three routes work it. Plans are the
 * second job: until a payment provider is wired in, an admin is how a provider gets one.
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

/* ------------------------------------------------------------------ *
 * Provider plans — assigned by hand until a payment provider writes them.
 * ------------------------------------------------------------------ */

const PROVIDERS_PAGE_SIZE = 20

/** Only the columns `mapAdminProvider` reads — never the profile, schedule or contact data. */
const ADMIN_PROVIDER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  slug: true,
  listed: true,
  plan: true,
  planExpiresAt: true,
  user: { select: { email: true } },
} as const

/**
 * Every word must match somewhere — first name, last name, account email or slug — so
 * "anna petrosyan" finds the provider whose names are in two columns. A plain
 * case-insensitive `contains`: this is an operator's lookup over a few hundred rows, not
 * Explore, and the typo-tolerant retry would only muddy which account is being changed.
 */
const providerSearchWhere = (q: string | undefined): Prisma.ProviderWhereInput => {
  const words = (q ?? '').split(/\s+/).filter(Boolean).slice(0, 5)
  if (!words.length) return {}
  return {
    AND: words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: 'insensitive' as const } },
        { lastName: { contains: word, mode: 'insensitive' as const } },
        { slug: { contains: word.toLowerCase() } },
        { user: { email: { contains: word, mode: 'insensitive' as const } } },
      ],
    })),
  }
}

adminRouter.get(
  '/providers',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const q = asBoundedString(req.query.q, 100)
    const requestedPage = asPositiveInt(req.query.page, 1, Number.MAX_SAFE_INTEGER)
    const perPage = asPositiveInt(req.query.perPage, PROVIDERS_PAGE_SIZE, 100)

    const where = providerSearchWhere(q)
    const total = await prisma.provider.count({ where })
    const { page, pageCount, skip } = resolvePageWindow(total, requestedPage, perPage)

    const providers = await prisma.provider.findMany({
      where,
      select: ADMIN_PROVIDER_SELECT,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip,
      take: perPage,
    })

    const now = new Date()
    return ok(res, { items: providers.map((p) => mapAdminProvider(p, now)), total, page, perPage, pageCount })
  })
)

/**
 * Set a provider's plan, and optionally when it lapses back to free — a trial, a founding
 * offer, or an invoice paid by hand. This is the only writer of `plan` until a payment
 * provider's webhook takes over (docs/BILLING.md).
 *
 * Changing the effective plan clears this month's allowance-notice stamps, so the new
 * plan's thresholds can notify again. Re-saving the same plan leaves them alone, or a
 * provider would be told twice in a month that they are nearly full.
 *
 * Logged with the acting account, because there is no audit table (docs/BACKLOG.md).
 */
adminRouter.patch(
  '/providers/:id/plan',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const now = new Date()
    const next = parseAdminPlanBody(req.body, now)

    const current = await prisma.provider.findUnique({
      where: { id: req.params.id! },
      select: { id: true, plan: true, planExpiresAt: true },
    })
    if (!current) throw new HttpError(404, 'Provider not found', 404)

    const planChanged = effectivePlan(current, now) !== effectivePlan(next, now)

    const provider = await prisma.provider.update({
      where: { id: current.id },
      data: {
        plan: next.plan,
        planExpiresAt: next.planExpiresAt,
        ...(planChanged ? { bookingCapWarnedAt: null, bookingCapReachedAt: null } : {}),
      },
      select: ADMIN_PROVIDER_SELECT,
    })

    console.info(
      `[admin] plan ${provider.id}: ${current.plan} -> ${next.plan}` +
        ` (until ${next.planExpiresAt?.toISOString() ?? 'no end'}) by user ${req.session!.userId}`
    )

    return ok(res, mapAdminProvider(provider, now))
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
