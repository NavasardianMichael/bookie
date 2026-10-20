import { Router } from 'express'
import multer from 'multer'
import { isGeminiConfigured } from '../config.js'
import { ok } from '../lib/api-response.js'
import { resolveBookingLocale } from '../lib/booking-mail.js'
import { GeminiError, generateJson } from '../lib/gemini.js'
import { IMPORT_ERROR } from '../lib/import-errors.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { asTrimmedString } from '../lib/request.js'
import { toTimeZone, weekdayInZone } from '../lib/time-zone.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { createProviderAppointments } from '../services/appointments.js'
import {
  buildImportPrompt,
  IMPORT_NOTE_MAX,
  importResponseSchema,
  type ImportRow,
  ImportValidationError,
  parseImportBody,
  parseImportResponse,
} from '../services/bookingImport.js'
import { notifyBookingAllowance } from '../services/planNotices.js'
import { assertPhotoImport, ENTITLEMENT_SELECT, getEntitlements } from '../services/plans.js'
import { countPhotoImportsToday, recordPhotoImport, releasePhotoImport } from '../services/planUsage.js'
import { dayKeyInZone } from '../services/providerBookings.js'

/**
 * Bookings from a photo of a provider's handwritten notes: read the photo into drafts, then
 * — after the provider has reviewed every one — write the ones they kept. Mounted at
 * `/provider-profile/bookings/import`, provider-only, scoped by session like every
 * `/provider-profile` route: the provider id is never read from the request.
 *
 * The rules live in `services/bookingImport.ts` (pure) and the writes in
 * `services/appointments.ts#createProviderAppointments`; this file is the HTTP around them.
 */
export const bookingImportRouter = Router()

/** Gemini's inline ceiling is 20MB for the whole request; a phone photo is a fraction of it. */
const MAX_PHOTO_BYTES = 10 * 1024 * 1024

/** What Gemini reads and a phone produces. HEIC is the iPhone's own format. */
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

/**
 * **Memory**, not `config.uploadDir`. That directory is served publicly at `/uploads`, and a
 * photo of a client list must never be one guessable URL away from anyone. The buffer goes
 * to Gemini and is dropped with the request.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 4 },
  fileFilter: (_req, file, accept) => {
    if (PHOTO_TYPES.has(file.mimetype)) return accept(null, true)
    accept(new HttpError(415, 'The photo must be a JPEG, PNG, WebP or HEIC image', 415))
  },
})

/**
 * Ten photos an hour per provider, on every plan. The free daily allowance is the plan's
 * business (`photoImportsPerDay`); this is the deployment's: one Gemini key's quota is
 * shared by every provider, so no single one may spend it — the argument `routes/contact.ts`
 * makes for the mail engine. Keyed on the provider, not the address (`routes/reviews.ts`).
 */
const parseLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 })

/** The bulk write's own brake, at the billing writes' rate. */
const createLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 })

const throttle = (limiter: typeof parseLimiter, key: string, res: Parameters<typeof ok>[0]): void => {
  const verdict = limiter(key)
  if (verdict.allowed) return
  res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
  throw new HttpError(429, 'Too many photo imports. Please try again later.', 429)
}

/**
 * Every way of not getting an answer, as the client should hear it. Google's own `429` keeps
 * its suggested wait; a refused or empty read is `unreadable`, the one case where another
 * photo — not another try — is the fix.
 */
const toHttpError = (error: unknown, res: Parameters<typeof ok>[0]): unknown => {
  if (!(error instanceof GeminiError)) return error
  if (error.status === 429) {
    res.setHeader('Retry-After', String(error.retryAfterSeconds ?? 60))
    return new HttpError(429, 'Photo reading is busy. Please try again shortly.', 429)
  }
  if (error.status === 422 || error.status === 400) {
    return new HttpError(422, 'The photo could not be read', IMPORT_ERROR.photoUnreadable)
  }
  // A key Google refuses is a misconfiguration this deployment has, not a passing outage.
  if (error.status === 401 || error.status === 403) {
    return new HttpError(503, 'Photo import is not available right now', IMPORT_ERROR.photoImportUnavailable)
  }
  if (error.timedOut) return new HttpError(504, 'Reading the photo took too long', 504)
  return new HttpError(502, 'Photo reading is unavailable', 502)
}

/**
 * `POST /parse` — multipart: `image` (the photo), `note` (≤ 300, optional context for the
 * model), `tz` (the browser's zone, used only when the provider has none), `locale`.
 * Answers `{ drafts }`, possibly empty.
 */
bookingImportRouter.post(
  '/parse',
  requireProvider,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId

    if (!isGeminiConfigured()) {
      throw new HttpError(503, 'Photo import is not available right now', IMPORT_ERROR.photoImportUnavailable)
    }

    const image = req.file
    if (!image?.buffer?.length) throw new HttpError(400, 'A photo is required', 400)

    const note = asTrimmedString(req.body?.note)
    if (note && note.length > IMPORT_NOTE_MAX) {
      throw new HttpError(400, `note must be ${IMPORT_NOTE_MAX} characters or fewer`, 400)
    }

    // After validation, so a malformed request costs nothing (`routes/contact.ts`).
    throttle(parseLimiter, `provider:${providerId}`, res)

    const now = new Date()
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        timeZone: true,
        ...ENTITLEMENT_SELECT,
        services: {
          where: { active: true },
          select: { id: true, name: true, durationMinutes: true },
          orderBy: { name: 'asc' },
        },
      },
    })
    if (!provider) throw new HttpError(404, 'Provider not found', 404)

    assertPhotoImport(await countPhotoImportsToday(providerId, now), getEntitlements(provider, now))

    const timeZone = provider.timeZone ?? toTimeZone(req.body?.tz) ?? 'UTC'
    const weekday = weekdayInZone(now, timeZone)
    const serviceIds = provider.services.map((service) => service.id)
    const prompt = buildImportPrompt({
      todayKey: dayKeyInZone(now, timeZone),
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
      timeZone,
      locale: resolveBookingLocale(req.body?.locale),
      services: provider.services,
      note,
    })

    // Spent before the call so two photos sent together cannot both slip under the
    // allowance, and given back on any failure: the provider's import is spent by a photo
    // that was read, never by an outage, a timeout or Google's own limit.
    const importId = await recordPhotoImport(providerId)
    let answer: string
    try {
      answer = await generateJson({
        ...prompt,
        image: { mimeType: image.mimetype, data: image.buffer },
        responseSchema: importResponseSchema(serviceIds),
      })
    } catch (error) {
      await releasePhotoImport(importId)
      throw toHttpError(error, res)
    }

    return ok(res, { drafts: parseImportResponse(answer, new Set(serviceIds)) })
  })
)

/**
 * `POST /` — JSON `{ bookings: [{ serviceId, startAt, fullName, phone: { code, number },
 * notes? }], locale? }`, 1 to 30 rows, every one reviewed. All or nothing; `201 { created }`.
 */
bookingImportRouter.post(
  '/',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId

    let rows: ImportRow[]
    try {
      rows = parseImportBody(req.body)
    } catch (error) {
      if (error instanceof ImportValidationError) throw new HttpError(400, error.message, 400)
      throw error
    }

    throttle(createLimiter, `provider:${providerId}`, res)

    const created = await createProviderAppointments(providerId, rows, new Date())

    // The 80% / 100% allowance emails, as after any booking — these count toward it. Not
    // awaited, and a failure costs the notice, never the bookings.
    void notifyBookingAllowance(providerId, resolveBookingLocale(req.body?.locale)).catch((error: unknown) => {
      console.error('[mail] booking allowance notice failed', error)
    })

    return ok(res, { created }, 201)
  })
)
