import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { isGeminiConfigured } from '../config.js'
import { ok } from '../lib/api-response.js'
import { ASSISTANT_ERROR } from '../lib/assistant-errors.js'
import { resolveBookingLocale } from '../lib/booking-mail.js'
import { SEEDED_CATEGORY_NAMES } from '../lib/category-names.js'
import { generateJson } from '../lib/gemini.js'
import { type GeminiErrorCopy, toGeminiHttpError } from '../lib/gemini-errors.js'
import { PLAN_ERROR } from '../lib/plan-errors.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { asTrimmedString } from '../lib/request.js'
import { earliestOpenDayKey } from '../lib/service-availability.js'
import { toTimeZone } from '../lib/time-zone.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { assertProfileAssistantRun, assertSlugChange, ENTITLEMENT_SELECT, getEntitlements } from '../services/plans.js'
import { countAssistantRunsToday, recordAssistantRun, releaseAssistantRun } from '../services/planUsage.js'
import {
  ASSISTANT_PROMPT_MAX,
  assistantResponseSchema,
  assistantSnapshot,
  AssistantValidationError,
  buildAssistantPrompt,
  exceedsServiceCap,
  parseApplyBody,
  parseAssistantResponse,
  planServiceChanges,
} from '../services/profileAssistant.js'
import { setProviderCategories } from '../services/providerCategories.js'
import { refreshProviderSeoStamp } from '../services/providerSeoStamp.js'
import { recordSlugChange } from '../services/providerWrites.js'

/**
 * The profile assistant — a provider's own description of their business, drafted into their
 * whole workspace by Gemini, reviewed by them, then applied in one transaction. Mounted at
 * `/provider-profile/assistant`, provider-only and scoped by session like every
 * `/provider-profile` route: the provider id is never read from the request.
 *
 * The rules live in `services/profileAssistant.ts` (pure); this file is the HTTP and the writes.
 */
export const profileAssistantRouter = Router()

/**
 * Five drafts an hour per provider, on every plan — the deployment's brake on the one shared
 * Gemini key, beside the plan's daily allowance (`profileAssistantRunsPerDay`). The argument
 * `routes/bookingImport.ts` makes for its own limiter.
 */
const generateLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 })

/** The apply's own brake, at the billing writes' rate. */
const applyLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 })

const throttle = (limiter: typeof generateLimiter, key: string, res: Parameters<typeof ok>[0]): void => {
  const verdict = limiter(key)
  if (verdict.allowed) return
  res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
  throw new HttpError(429, 'Too many profile assistant requests. Please try again later.', 429)
}

const ASSISTANT_ERROR_COPY: GeminiErrorCopy = {
  busy: 'The profile assistant is busy. Please try again shortly.',
  unreadable: { message: 'Nothing could be drafted from that description', code: ASSISTANT_ERROR.assistantUnreadable },
  unavailable: { message: 'The profile assistant is not available right now', code: ASSISTANT_ERROR.assistantUnavailable },
  timedOut: 'Drafting the profile took too long',
  failed: 'The profile assistant is unavailable',
}

/** What `assistantSnapshot` reads, plus what the plan checks need. Active services only. */
const SNAPSHOT_SELECT = {
  fullName: true,
  description: true,
  weekSchedule: true,
  timeZone: true,
  timeFormat: true,
  requiresBookingApproval: true,
  paymentInfo: true,
  emailNotificationPrefs: true,
  seoTitle: true,
  seoDescription: true,
  slug: true,
  draft: true,
  country: true,
  ...ENTITLEMENT_SELECT,
  categories: { select: { category: { select: { id: true, name: true } } } },
  services: {
    where: { active: true },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      price: true,
      currency: true,
      availability: true,
    },
    orderBy: { name: 'asc' },
  },
} satisfies Prisma.ProviderSelect

/** The draft keys the assistant writes live — dropped from `Provider.draft` so a stale one cannot overwrite them on Publish. */
const APPLIED_DRAFT_KEYS = ['fullName', 'description', 'weekSchedule', 'timeZone', 'timeFormat', 'paymentInfo'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * `GET /` — whether the assistant should open by itself (never closed or applied yet), whether
 * this deployment has it at all, and today's allowance — what the button and its sheet need
 * before the provider types anything.
 */
profileAssistantRouter.get(
  '/',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const now = new Date()
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { assistantSeenAt: true, ...ENTITLEMENT_SELECT },
    })
    if (!provider) throw new HttpError(404, 'Provider not found', 404)

    return ok(res, {
      pending: provider.assistantSeenAt === null,
      available: isGeminiConfigured(),
      runsPerDay: getEntitlements(provider, now).profileAssistantRunsPerDay,
      runsToday: await countAssistantRunsToday(providerId, now),
    })
  })
)

/**
 * `POST /generate` — JSON `{ description (≤ 2000), locale, tz }`. Answers `{ proposal }`: the
 * whole workspace as the description would have it, for the review sheet. Saves nothing.
 */
profileAssistantRouter.post(
  '/generate',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId

    if (!isGeminiConfigured()) {
      throw new HttpError(503, ASSISTANT_ERROR_COPY.unavailable.message, ASSISTANT_ERROR.assistantUnavailable)
    }

    const description = asTrimmedString(req.body?.description)
    if (!description) throw new HttpError(400, 'Describe your business first', 400)
    if (description.length > ASSISTANT_PROMPT_MAX) {
      throw new HttpError(400, `description must be ${ASSISTANT_PROMPT_MAX} characters or fewer`, 400)
    }

    // After validation, so a malformed request costs nothing (`routes/contact.ts`).
    throttle(generateLimiter, `provider:${providerId}`, res)

    const now = new Date()
    const [provider, categories] = await Promise.all([
      prisma.provider.findUnique({ where: { id: providerId }, select: SNAPSHOT_SELECT }),
      prisma.category.findMany({ where: { name: { in: [...SEEDED_CATEGORY_NAMES] } }, select: { id: true, name: true } }),
    ])
    if (!provider) throw new HttpError(404, 'Provider not found', 404)

    const entitlements = getEntitlements(provider, now)
    assertProfileAssistantRun(await countAssistantRunsToday(providerId, now), entitlements)

    const snapshot = assistantSnapshot(provider)
    // A provider who never set a zone gets the browser's, as onboarding gives them —
    // proposed, so the review shows it.
    const current = { ...snapshot, timeZone: snapshot.timeZone ?? toTimeZone(req.body?.tz) }
    const context = {
      current,
      categories,
      maxActiveServices: entitlements.maxActiveServices,
      customSlug: entitlements.customSlug,
      today: earliestOpenDayKey(now),
      locale: resolveBookingLocale(req.body?.locale),
      country: provider.country,
    }
    const serviceIds = snapshot.services.flatMap((service) => (service.id ? [service.id] : []))

    // Spent before the call and given back on any failure, as a photo import is.
    const runId = await recordAssistantRun(providerId)
    let answer: string
    try {
      answer = await generateJson({
        ...buildAssistantPrompt(context, description),
        responseSchema: assistantResponseSchema(serviceIds),
      })
    } catch (error) {
      await releaseAssistantRun(runId)
      throw toGeminiHttpError(error, res, ASSISTANT_ERROR_COPY)
    }

    const proposal = parseAssistantResponse(answer, context)
    if (!proposal) {
      await releaseAssistantRun(runId)
      throw new HttpError(422, ASSISTANT_ERROR_COPY.unreadable.message, ASSISTANT_ERROR.assistantUnreadable)
    }

    return ok(res, { proposal })
  })
)

/**
 * `POST /apply` — the reviewed proposal, JSON. Writes it all in one transaction and publishes
 * it: profile, categories, hours, clock, approval, payment, notifications, SEO and services.
 * `listed` is untouched — a new page stays unpublished until "Publish page". Answers `true`.
 */
profileAssistantRouter.post(
  '/apply',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const now = new Date()

    let proposal: ReturnType<typeof parseApplyBody>
    try {
      proposal = parseApplyBody(req.body, earliestOpenDayKey(now))
    } catch (error) {
      if (error instanceof AssistantValidationError) throw new HttpError(400, error.message, 400)
      throw error
    }

    throttle(applyLimiter, `provider:${providerId}`, res)

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        slug: true,
        draft: true,
        paymentInfo: true,
        ...ENTITLEMENT_SELECT,
        services: { select: { id: true, active: true, _count: { select: { appointments: true } } } },
      },
    })
    if (!provider) throw new HttpError(404, 'Provider not found', 404)

    let changes: ReturnType<typeof planServiceChanges>
    try {
      changes = planServiceChanges(
        provider.services.map((service) => ({
          id: service.id,
          active: service.active,
          booked: service._count.appointments > 0,
        })),
        proposal.services
      )
    } catch (error) {
      if (error instanceof AssistantValidationError) throw new HttpError(400, error.message, 400)
      throw error
    }

    const entitlements = getEntitlements(provider, now)
    if (exceedsServiceCap(changes, entitlements.maxActiveServices)) {
      throw new HttpError(
        403,
        `Your plan allows ${entitlements.maxActiveServices} active services. Remove some or upgrade to add more.`,
        PLAN_ERROR.serviceLimit
      )
    }
    assertSlugChange(provider.slug, proposal.slug, entitlements)

    // The pay-to number is never drafted by the assistant: whatever the provider last saw
    // (their draft, else the live value) is kept as it is.
    const draft = isRecord(provider.draft) ? provider.draft : {}
    const paymentSource = 'paymentInfo' in draft ? draft.paymentInfo : provider.paymentInfo
    const payToNumber = isRecord(paymentSource) ? asTrimmedString(paymentSource.payToNumber) : undefined
    const remainingDraft = Object.fromEntries(
      Object.entries(draft).filter(([key]) => !(APPLIED_DRAFT_KEYS as readonly string[]).includes(key))
    )

    try {
      await prisma.$transaction(async (tx) => {
        await recordSlugChange(tx, providerId, provider.slug, proposal.slug)
        await tx.provider.update({
          where: { id: providerId },
          data: {
            fullName: proposal.fullName,
            description: proposal.description,
            weekSchedule: proposal.weekSchedule,
            timeZone: proposal.timeZone,
            timeFormat: proposal.timeFormat,
            requiresBookingApproval: proposal.requiresBookingApproval,
            paymentInfo: {
              methods: proposal.paymentMethods,
              ...(payToNumber ? { payToNumber } : {}),
              ...(proposal.paymentNotes ? { notes: proposal.paymentNotes } : {}),
            },
            emailNotificationPrefs: proposal.notifications,
            seoTitle: proposal.seoTitle,
            seoDescription: proposal.seoDescription,
            slug: proposal.slug,
            draft: Object.keys(remainingDraft).length ? (remainingDraft as Prisma.InputJsonValue) : Prisma.DbNull,
            assistantSeenAt: now,
          },
        })
        await setProviderCategories(
          tx,
          providerId,
          proposal.categories.map((category) => (category.id ? { id: category.id } : { name: category.name }))
        )

        if (changes.remove.length) {
          await tx.service.deleteMany({ where: { providerId, id: { in: changes.remove }, appointments: { none: {} } } })
        }
        if (changes.deactivate.length) {
          await tx.service.updateMany({ where: { providerId, id: { in: changes.deactivate } }, data: { active: false } })
        }
        for (const service of changes.update) {
          await tx.service.update({ where: { id: service.id, providerId }, data: { ...serviceColumns(service), active: true } })
        }
        for (const service of changes.create) {
          await tx.service.create({ data: { ...serviceColumns(service), providerId, active: true } })
        }
      })
    } catch (error) {
      // Only the slug is unique among what this writes — the SEO tab's own answer for it.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'That link is already taken. Please choose another.', 409)
      }
      throw error
    }

    await refreshProviderSeoStamp(providerId)
    return ok(res, true)
  })
)

/** A proposed service as `Service` columns. "Always" is SQL NULL, the column's own meaning for it. */
const serviceColumns = (service: ReturnType<typeof parseApplyBody>['services'][number]) => ({
  name: service.name,
  description: service.description,
  durationMinutes: service.duration,
  price: service.price,
  currency: service.currency,
  availability: service.availability.mode === 'always' ? Prisma.DbNull : service.availability,
})

/**
 * `POST /dismiss` — the provider closed the assistant without applying it, so it stops opening
 * by itself. Idempotent: an earlier stamp is kept. The button still opens it any time.
 */
profileAssistantRouter.post(
  '/dismiss',
  requireProvider,
  asyncHandler(async (req, res) => {
    await prisma.provider.updateMany({
      where: { id: req.session!.profileId, assistantSeenAt: null },
      data: { assistantSeenAt: new Date() },
    })
    return ok(res, true)
  })
)
