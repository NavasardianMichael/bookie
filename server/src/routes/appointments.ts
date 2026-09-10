import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { asBoundedString, asTrimmedString, isEmail } from '../lib/request.js'
import type { SessionPayload } from '../lib/session.js'
import { mapBasicProvider, providerInclude } from '../mappers/entities.js'
import { hasSessionCookie, requireAuth } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { createAppointment, type GuestBooker } from '../services/appointments.js'
import { BOOKING_STATUSES, isBookingStatus } from '../services/providerBookings.js'

export const appointmentsRouter = Router()

/** Matches `MAX_CHARS_FOR_TEXTAREA` and the `maxCharsForTextarea` rule on the client. */
const MAX_NOTES_LENGTH = 300

const MAX_GUEST_NAME_LENGTH = 40

/**
 * Twenty an hour per address. Booking is public, so this is the only thing standing
 * between an open `POST` and a script filling a provider's calendar — the overlap `409`
 * bounds what one request can take, not how many arrive.
 *
 * Generous on purpose: a household booking several appointments from one connection is
 * ordinary, and unlike the contact form there is no shared external quota to protect.
 * Per-process and in-memory, so it is an abuse brake rather than a guarantee — see
 * `lib/rateLimit.ts`.
 */
const limiter = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 })

/**
 * Rejected rather than truncated, deviating from `asBoundedString`'s house rule.
 *
 * The rule is "cap where the length is not itself a signal", and for a contact message
 * that holds. Here it does not: the field is capped at 300 in the browser with a live
 * counter, so a longer body means a non-browser caller — and silently dropping the tail
 * of a note is how "I am allergic to penicillin" reaches a provider as
 * "I am allergic to".
 */
const parseNotes = (notes: unknown): string | undefined => {
  const trimmed = asTrimmedString(notes)
  if (!trimmed) return undefined
  if (trimmed.length > MAX_NOTES_LENGTH) {
    throw new HttpError(400, `notes must be ${MAX_NOTES_LENGTH} characters or fewer`, 400)
  }
  return trimmed
}

/**
 * The minimum needed to actually deliver the service to someone with no account.
 *
 * **Nothing reconciles a guest with an account today.** An earlier version of this comment
 * claimed the phone mirrored `User.phoneCode`/`phoneNumber` "so a guest who later registers
 * on the same number is recognisable" — no code ever did that, and phone is not identity
 * any more, so it never will. `guestEmail` is the handle if it is ever built (accounts are
 * keyed on email, and `services/providerAnalytics.ts` already groups repeat guests by it),
 * which is why the `appointment_actor_present` CHECK now requires it.
 *
 * If it *is* built, it must run when an address is **verified**, never at registration —
 * otherwise anyone could register with a stranger's address and inherit their booking
 * history. Tracked in `docs/BACKLOG.md`.
 */
const parseGuest = (guest: unknown): GuestBooker => {
  const { firstName, lastName, phone, email } = (guest ?? {}) as {
    firstName?: unknown
    lastName?: unknown
    phone?: { code?: unknown; number?: unknown }
    email?: unknown
  }

  const first = asBoundedString(firstName, MAX_GUEST_NAME_LENGTH)
  const last = asBoundedString(lastName, MAX_GUEST_NAME_LENGTH)
  const mail = asTrimmedString(email)?.toLowerCase()
  const code = Number(phone?.code)
  const number = Number(phone?.number)

  if (!first || !last) throw new HttpError(400, 'guest.firstName and guest.lastName required', 400)
  if (!Number.isInteger(code) || !Number.isInteger(number) || code <= 0 || number <= 0) {
    throw new HttpError(400, 'guest.phone must carry a numeric code and number', 400)
  }
  // `isEmail` length-checks before the regex, which matters on an unauthenticated route:
  // the pattern is ambiguous, so an unbounded input is a backtracking cost per request.
  if (!mail || !isEmail(mail)) {
    throw new HttpError(400, 'guest.email must be a valid email address', 400)
  }

  return { firstName: first, lastName: last, phoneCode: code, phoneNumber: BigInt(number), email: mail }
}

/**
 * The Consumer id to book against for a signed-in caller.
 *
 * A consumer session already names one. Any other role belongs to a `User` whose email is
 * verified — an unverified account cannot hold a session at all — so a Consumer profile is
 * created on it rather than sending a signed-in user down the guest path. That is what
 * keeps the booking in their own appointment history.
 *
 * Phone and country are copied off the Provider row because that is the only place this
 * person's answers exist. **No email is copied**: it lives on the shared `User`, which is
 * the whole point of moving it there — the two profiles can no longer disagree about the
 * account's address.
 */
const resolveConsumerId = async (session: SessionPayload): Promise<string> => {
  if (session.role === 'consumer') return session.profileId

  const existing = await prisma.consumer.findUnique({ where: { userId: session.userId } })
  if (existing) return existing.id

  const provider = await prisma.provider.findUnique({ where: { userId: session.userId } })
  // `phoneCode`/`phoneNumber` are NOT NULL on Consumer, so there is nothing to fall back to
  // — the old `provider?.firstName ?? 'New'` placeholder cannot cover a missing phone. A
  // provider session whose Provider row is gone is a 409 rather than a Prisma error.
  if (!provider) throw new HttpError(409, 'No profile to book from', 409)

  const created = await prisma.consumer.create({
    data: {
      userId: session.userId,
      firstName: provider.firstName,
      lastName: provider.lastName,
      phoneCode: provider.phoneCode,
      phoneNumber: provider.phoneNumber,
      country: provider.country,
    },
  })
  return created.id
}

/** Guest contact details, or undefined when the booking names a real Consumer. */
const mapGuest = (appointment: {
  guestFirstName: string | null
  guestLastName: string | null
  guestPhoneCode: number | null
  guestPhoneNumber: bigint | null
  guestEmail: string | null
}) => {
  if (!appointment.guestFirstName) return undefined
  return {
    firstName: appointment.guestFirstName,
    lastName: appointment.guestLastName ?? '',
    // `Number(...)`, as every other BigInt crossing this boundary does — JSON has no
    // BigInt and `JSON.stringify` throws on one.
    phone: {
      code: appointment.guestPhoneCode ?? 0,
      number: Number(appointment.guestPhoneNumber ?? 0),
    },
    email: appointment.guestEmail ?? undefined,
  }
}

appointmentsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const where =
      req.session!.role === 'consumer'
        ? { consumerId: req.session!.profileId }
        : { providerId: req.session!.profileId }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: true,
        provider: { include: providerInclude },
        consumer: { include: { user: true } },
      },
      orderBy: { startAt: 'asc' },
    })

    return ok(
      res,
      appointments.map((a) => ({
        id: a.id,
        consumerId: a.consumerId ?? undefined,
        providerId: a.providerId,
        serviceId: a.serviceId,
        organizationId: a.organizationId ?? undefined,
        time: {
          startDate: a.startAt.toISOString(),
          endDate: a.endAt.toISOString(),
          duration: a.durationMinutes,
        },
        status: a.status,
        notes: a.notes ?? undefined,
        paymentMethods: a.paymentMethods,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        provider: mapBasicProvider(a.provider),
        service: { id: a.service.id, name: a.service.name },
        // One of the two is always present. A provider's list has to show guest
        // bookings too, or the bookings they cannot see are exactly the ones with
        // nobody to chase them up with.
        consumer: a.consumer
          ? {
              id: a.consumer.id,
              basic: {
                firstName: a.consumer.firstName,
                lastName: a.consumer.lastName,
              },
            }
          : undefined,
        guest: mapGuest(a),
      }))
    )
  })
)

/**
 * Booking is deliberately **not** role-gated.
 *
 * It used to sit behind `requireConsumer`, which made a signed-in provider viewing
 * another provider's page a `403` — a role check standing in for an identity check.
 * Anyone can be a consumer, so the only question is whether we know who is booking:
 *
 * - a consumer session books as itself;
 * - any other session belongs to a user whose email is verified, so it gets a Consumer
 *   profile created on that same `User` and books as a real account, keeping its history;
 * - **no session at all books as a guest**, carrying its contact details on the
 *   appointment. Guest booking is a first-class path here and stays completely public.
 *
 * `optionalAuth` is mounted globally in `app.ts`, so `req.session` is already resolved —
 * and, since it now validates `tokenVersion`, a revoked cookie leaves it unset. That case
 * must not be mistaken for a guest; see the 401 below.
 */
appointmentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { providerId, serviceId, startAt, notes, paymentMethods, guest } = req.body ?? {}
    if (!providerId || !serviceId || !startAt) {
      throw new HttpError(400, 'providerId, serviceId, and startAt required', 400)
    }

    const start = new Date(startAt)
    if (Number.isNaN(start.getTime())) throw new HttpError(400, 'Invalid startAt', 400)

    /**
     * A cookie that `optionalAuth` declined to honour — revoked by a password reset, or
     * belonging to a deleted account. Falling through to the guest branch would answer
     * "guest.firstName required" to someone who believes they are signed in, so this is a
     * 401 instead, which the axios layer already turns into a re-authentication.
     *
     * A request with **no** cookie is a genuine guest and is untouched by this.
     */
    if (!req.session && hasSessionCookie(req)) {
      throw new HttpError(401, 'Your session has expired. Please sign in again.', 401)
    }

    // A provider cannot book their own service — the appointment would name the same
    // person on both sides and occupy a slot in their own calendar.
    if (req.session?.role === 'provider' && req.session.profileId === providerId) {
      throw new HttpError(400, 'You cannot book your own service', 400)
    }

    /**
     * Counted after validation, so a malformed body never spends from the budget — the
     * same reasoning as `routes/contact.ts`. Keyed on the session where there is one, so
     * a signed-in visitor is bounded by their account rather than by whatever address
     * they share with everyone else behind the same NAT.
     */
    const verdict = limiter(req.session ? `session:${req.session.userId}` : `ip:${req.ip ?? 'unknown'}`)
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      throw new HttpError(429, 'Too many booking attempts. Please try again later.', 429)
    }

    const appointment = await createAppointment({
      // Identity comes from the session whenever there is one. Guest fields in the
      // body are ignored in that case, so a signed-in caller cannot book under
      // someone else's name.
      ...(req.session ? { consumerId: await resolveConsumerId(req.session) } : { guest: parseGuest(guest) }),
      providerId,
      serviceId,
      startAt: start,
      notes: parseNotes(notes),
      paymentMethods,
    })

    return ok(
      res,
      {
        id: appointment.id,
        consumerId: appointment.consumerId ?? undefined,
        providerId: appointment.providerId,
        serviceId: appointment.serviceId,
        time: {
          startDate: appointment.startAt.toISOString(),
          endDate: appointment.endAt.toISOString(),
          duration: appointment.durationMinutes,
        },
        status: appointment.status,
        notes: appointment.notes ?? undefined,
        paymentMethods: appointment.paymentMethods,
        guest: mapGuest(appointment),
      },
      201
    )
  })
)

appointmentsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } })
    if (!appointment) throw new HttpError(404, 'Appointment not found', 404)

    const isOwner =
      (req.session!.role === 'consumer' && appointment.consumerId === req.session!.profileId) ||
      (req.session!.role === 'provider' && appointment.providerId === req.session!.profileId)

    if (!isOwner) throw new HttpError(403, 'Forbidden', 403)

    // Narrowed against the enum rather than passed through. It used to reach Prisma
    // unchecked, which only stayed harmless while the sole caller sent nothing at all
    // and took the `'cancelled'` default; the provider bookings tab is the first UI
    // that names a status, so an unknown value is now reachable from the client.
    const requested = req.body?.status ?? 'cancelled'
    if (!isBookingStatus(requested)) {
      throw new HttpError(400, `status must be one of: ${BOOKING_STATUSES.join(', ')}`, 400)
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: requested },
    })

    return ok(res, { id: updated.id, status: updated.status })
  })
)
