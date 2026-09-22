import { Router } from 'express'
import { config } from '../config.js'
import { ok } from '../lib/api-response.js'
import {
  buildApprovalsUrl,
  buildBookingManageUrl,
  formatBookingWhen,
  resolveBookingLocale,
  sendBookingApprovalRequestEmail,
  sendBookingConfirmationEmail,
  sendBookingRequestedEmail,
  sendBookingRescheduledToGuestEmail,
  sendBookingRescheduledToProviderEmail,
} from '../lib/booking-mail.js'
import { prisma } from '../lib/prisma.js'
import { createRateLimiter } from '../lib/rateLimit.js'
import { asBoundedString, asTrimmedString, isEmail } from '../lib/request.js'
import type { SessionPayload } from '../lib/session.js'
import { hashUrlToken, isOwnerManageToken, mintOwnerManageToken, readOwnerManageAppointmentId } from '../lib/token.js'
import { mapBasicProvider, mapSingleProvider, providerInclude } from '../mappers/entities.js'
import { hasSessionCookie, requireAuth } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { createAppointment, type GuestBooker, rescheduleAppointment } from '../services/appointments.js'
import { BOOKING_STATUSES, isBookingStatus } from '../services/providerBookings.js'

export const appointmentsRouter = Router()

/** Statuses a booking can still be moved out of by the person who made it. */
const UPCOMING_STATUSES: readonly string[] = ['pending', 'scheduled', 'confirmed']

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
 * keyed on email, and `services/providerAnalytics.ts` already groups repeat guests by it).
 * Email is optional on a guest booking — phone is the required contact.
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
  if (!Number.isInteger(number) || number <= 0) {
    throw new HttpError(400, 'guest.phone must carry a numeric number', 400)
  }
  // `code: 0` is an anonymous booking typed without a country picker.
  const hasCode = phone?.code !== undefined && phone.code !== null && phone.code !== ''
  if (hasCode && (!Number.isInteger(code) || code < 0)) {
    throw new HttpError(400, 'guest.phone must carry a numeric code and number', 400)
  }
  // `isEmail` length-checks before the regex, which matters on an unauthenticated route:
  // the pattern is ambiguous, so an unbounded input is a backtracking cost per request.
  if (mail && !isEmail(mail)) {
    throw new HttpError(400, 'guest.email must be a valid email address', 400)
  }

  return {
    firstName: first,
    lastName: last,
    phoneCode: Number.isInteger(code) && code > 0 ? code : 0,
    phoneNumber: BigInt(number),
    email: mail,
  }
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
  // Consumer.phoneCode/phoneNumber stay NOT NULL. A provider who registered without a
  // number cannot mint a Consumer row until they add one — 409 rather than a Prisma error
  // or a `{0,0}` dummy that would land on the booked provider's client list.
  if (!provider) throw new HttpError(409, 'No profile to book from', 409)
  if (provider.phoneCode === null || provider.phoneNumber === null) {
    throw new HttpError(409, 'A phone number is required to book', 409)
  }

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

/**
 * True when this session is the consumer on the appointment. A provider who booked
 * someone else holds a Consumer row on the same User; we look that up rather than
 * creating one — a PATCH must not mint a profile just to decide ownership.
 */
const isAppointmentConsumer = async (
  session: SessionPayload,
  appointment: { consumerId: string | null }
): Promise<boolean> => {
  if (!appointment.consumerId) return false
  if (session.role === 'consumer') return appointment.consumerId === session.profileId

  const consumer = await prisma.consumer.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  })
  return consumer?.id === appointment.consumerId
}

/**
 * Everything the booking emails name, read off the row in one query.
 *
 * Off the *row* rather than off the session and the request body, which is what the
 * create handler used to do across two more queries: `resolveConsumerId` copies a
 * booking provider's name onto the Consumer it mints, so the row already knows who
 * booked under either identity, and the row is also the only source that stays right
 * for the approve/reject sends that happen minutes or days later.
 *
 * `to` is the booker and `providerTo` the professional — both `User.email`, never
 * `publicEmail`, which nothing authenticates and anyone can set. Either can be absent:
 * a guest may book with a phone and no address at all.
 */
const buildBookingNotice = async (appointmentId: string) => {
  const row = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      startAt: true,
      providerId: true,
      guestEmail: true,
      guestFirstName: true,
      guestLastName: true,
      service: { select: { name: true } },
      consumer: { select: { firstName: true, lastName: true, user: { select: { email: true } } } },
      provider: { select: { firstName: true, lastName: true, user: { select: { email: true } } } },
    },
  })
  if (!row) return null

  const bookerName =
    [row.guestFirstName, row.guestLastName].filter(Boolean).join(' ') ||
    [row.consumer?.firstName, row.consumer?.lastName].filter(Boolean).join(' ') ||
    'A client'

  return {
    to: row.guestEmail ?? row.consumer?.user.email ?? undefined,
    providerTo: row.provider.user.email,
    providerId: row.providerId,
    bookerName,
    bookerFirstName: row.guestFirstName ?? row.consumer?.firstName ?? 'there',
    providerFirstName: row.provider.firstName,
    providerName: `${row.provider.firstName} ${row.provider.lastName}`.trim() || 'your provider',
    serviceName: row.service.name,
    when: formatBookingWhen(row.startAt),
  }
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
        // Reconstructable owner token — the emailed raw value is not stored. Only
        // a consumer reading their own list gets one, so a provider cannot mint a
        // manage URL for someone else's booking off this route.
        ...(req.session!.role === 'consumer'
          ? { manageToken: mintOwnerManageToken(a.id, config.jwtSecret) }
          : {}),
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
     * belonging to a deleted account.
     *
     * If the body still carries guest fields, the visitor filled the anonymous form
     * (Header's `getMe` 401 is ignored, so the UI thinks they are signed out). Treat
     * that as a guest booking rather than 401ing them into registration.
     *
     * No guest payload + a dead cookie is still a 401: they believe they are signed
     * in, and answering "guest.firstName required" would be the wrong error.
     *
     * A request with **no** cookie is a genuine guest and is untouched by this.
     */
    const hasGuestPayload = guest !== null && typeof guest === 'object'
    if (!req.session && hasSessionCookie(req) && !hasGuestPayload) {
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

    const guestBooker = req.session ? undefined : parseGuest(guest)

    const { appointment, manageToken, requiresApproval } = await createAppointment({
      // Identity comes from the session whenever there is one. Guest fields in the
      // body are ignored in that case, so a signed-in caller cannot book under
      // someone else's name.
      ...(req.session ? { consumerId: await resolveConsumerId(req.session) } : { guest: guestBooker! }),
      providerId,
      serviceId,
      startAt: start,
      notes: parseNotes(notes),
      paymentMethods,
    })

    /**
     * Mail is best-effort. The row is already committed — a down engine, a missing
     * key in production, or a throw here must still return 201 with `emailSent: false`.
     *
     * Which message goes out is decided by `requiresApproval`, not by the caller:
     * telling someone "your booking is confirmed" while it sits in a queue is the
     * failure this branch exists to prevent. When approval is on, the provider gets
     * the actionable half — and that send is deliberately not conditioned on
     * `emailSent`, because the booker's mail failing must not also lose the decision
     * request.
     */
    let emailSent = false
    try {
      const notice = await buildBookingNotice(appointment.id)
      const locale = resolveBookingLocale(req.body?.locale)

      if (notice?.to) {
        const manageUrl = buildBookingManageUrl(config.corsOrigin, locale, manageToken)
        const send = requiresApproval ? sendBookingRequestedEmail : sendBookingConfirmationEmail
        const mailed = await send({
          to: notice.to,
          firstName: notice.bookerFirstName,
          providerName: notice.providerName,
          serviceName: notice.serviceName,
          when: notice.when,
          manageUrl,
        })
        emailSent = mailed.ok
      }

      if (requiresApproval && notice?.providerTo) {
        await sendBookingApprovalRequestEmail({
          to: notice.providerTo,
          providerFirstName: notice.providerFirstName,
          bookerName: notice.bookerName,
          serviceName: notice.serviceName,
          when: notice.when,
          approvalsUrl: buildApprovalsUrl(config.corsOrigin, locale),
        })
      }
    } catch (error) {
      console.error('[mail] booking confirmation failed', error)
    }

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
        manageToken,
        emailSent,
        // What the confirm sheet renders: "confirmed" or "sent for approval". Derived
        // from the row's own status rather than echoed from the provider setting, so
        // the sheet cannot claim a state the appointment is not in.
        requiresApproval,
      },
      201
    )
  })
)

const managedInclude = {
  service: true,
  consumer: { select: { firstName: true, lastName: true } },
  provider: { include: providerInclude },
} as const

const findByManageToken = async (raw: string) => {
  // Owner tokens are HMAC(id), not a stored hash — skip the hash lookup so a
  // guessed `own.<uuid>.<junk>` does not pay for a unique-index miss first.
  if (isOwnerManageToken(raw)) {
    const appointmentId = readOwnerManageAppointmentId(raw, config.jwtSecret)
    if (!appointmentId) throw new HttpError(404, 'Appointment not found', 404)
    const byId = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: managedInclude,
    })
    if (!byId) throw new HttpError(404, 'Appointment not found', 404)
    return byId
  }

  const appointment = await prisma.appointment.findUnique({
    where: { manageTokenHash: hashUrlToken(raw) },
    include: managedInclude,
  })
  if (!appointment) throw new HttpError(404, 'Appointment not found', 404)
  return appointment
}

const serializeManaged = (
  appointment: Awaited<ReturnType<typeof findByManageToken>>
) => ({
  appointment: {
    id: appointment.id,
    status: appointment.status,
    notes: appointment.notes ?? undefined,
    paymentMethods: appointment.paymentMethods,
    time: {
      startDate: appointment.startAt.toISOString(),
      endDate: appointment.endAt.toISOString(),
      duration: appointment.durationMinutes,
    },
    price: appointment.price === null || appointment.price === undefined ? undefined : Number(appointment.price),
    currency: appointment.currency ?? undefined,
    service: {
      id: appointment.service.id,
      name: appointment.service.name,
      description: appointment.service.description ?? undefined,
    },
    guest: mapGuest(appointment),
    consumer: appointment.consumer
      ? { firstName: appointment.consumer.firstName, lastName: appointment.consumer.lastName }
      : undefined,
  },
  provider: mapSingleProvider(appointment.provider),
})

/**
 * Best-effort, like create. The row is already saved — a down engine must not
 * fail the PATCH. The provider address is `User.email`, never `publicEmail`.
 * The manage URL stays the same token: it is a capability handle, not a hash of
 * the slot, so it is not sent to the provider.
 */
const notifyReschedule = async (appointmentId: string, manageToken: string, locale: string) => {
  const notice = await buildBookingNotice(appointmentId)
  if (!notice) return

  const manageUrl = buildBookingManageUrl(config.corsOrigin, locale, manageToken)

  if (notice.to) {
    await sendBookingRescheduledToGuestEmail({
      to: notice.to,
      firstName: notice.bookerFirstName,
      providerName: notice.providerName,
      when: notice.when,
      manageUrl,
    })
  }
  await sendBookingRescheduledToProviderEmail({
    to: notice.providerTo,
    providerFirstName: notice.providerFirstName,
    guestName: notice.bookerName,
    serviceName: notice.serviceName,
    when: notice.when,
  })
}

appointmentsRouter.get(
  '/manage/:token',
  asyncHandler(async (req, res) => {
    const appointment = await findByManageToken(req.params.token)
    return ok(res, serializeManaged(appointment))
  })
)

/**
 * Public write behind the capability token. Cancel or reschedule, never both in one
 * body. Rate-limited like create: this is an unauthenticated mutation.
 */
appointmentsRouter.patch(
  '/manage/:token',
  asyncHandler(async (req, res) => {
    const verdict = limiter(`manage:${req.ip ?? 'unknown'}`)
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfterSeconds))
      throw new HttpError(429, 'Too many booking attempts. Please try again later.', 429)
    }

    const existing = await findByManageToken(req.params.token)
    const { status, serviceId, startAt } = req.body ?? {}
    const wantsCancel = status !== undefined && status !== null && status !== ''
    const wantsReschedule = serviceId !== undefined || startAt !== undefined

    if (wantsCancel && wantsReschedule) {
      throw new HttpError(400, 'Send either status or a new slot, not both', 400)
    }

    if (wantsCancel) {
      if (status !== 'cancelled') {
        throw new HttpError(400, 'Public manage can only set status to cancelled', 400)
      }
      if (!UPCOMING_STATUSES.includes(existing.status)) {
        throw new HttpError(409, 'This booking can no longer be changed', 409)
      }
      await prisma.appointment.update({
        where: { id: existing.id },
        data: { status: 'cancelled' },
      })
    } else if (wantsReschedule) {
      if (!serviceId || !startAt) {
        throw new HttpError(400, 'serviceId and startAt required to reschedule', 400)
      }
      const start = new Date(startAt)
      if (Number.isNaN(start.getTime())) throw new HttpError(400, 'Invalid startAt', 400)
      await rescheduleAppointment({ appointmentId: existing.id, serviceId, startAt: start })
      try {
        await notifyReschedule(existing.id, req.params.token, resolveBookingLocale(req.body?.locale))
      } catch (error) {
        console.error('[mail] booking reschedule notify failed', error)
      }
    } else {
      throw new HttpError(400, 'Send status cancelled or a new serviceId and startAt', 400)
    }

    const updated = await findByManageToken(req.params.token)
    return ok(res, serializeManaged(updated))
  })
)

appointmentsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } })
    if (!appointment) throw new HttpError(404, 'Appointment not found', 404)

    const session = req.session!
    const isProviderOwner = session.role === 'provider' && appointment.providerId === session.profileId
    const isConsumerOwner = await isAppointmentConsumer(session, appointment)

    if (!isProviderOwner && !isConsumerOwner) throw new HttpError(403, 'Forbidden', 403)

    // Narrowed against the enum rather than passed through. It used to reach Prisma
    // unchecked, which only stayed harmless while the sole caller sent nothing at all
    // and took the `'cancelled'` default; the provider bookings tab is the first UI
    // that names a status, so an unknown value is now reachable from the client.
    const requested = req.body?.status ?? 'cancelled'
    if (!isBookingStatus(requested)) {
      throw new HttpError(400, `status must be one of: ${BOOKING_STATUSES.join(', ')}`, 400)
    }

    // Acting as the client, not the provider who received the booking: cancel only,
    // and only while the slot is still upcoming. Confirm / complete / no-show are
    // the receiving provider's verbs.
    if (isConsumerOwner && !isProviderOwner) {
      if (requested !== 'cancelled') {
        throw new HttpError(400, 'A client can only cancel a booking', 400)
      }
      // `pending` belongs here: a request still waiting on the provider is upcoming,
      // and withdrawing it is the one thing its maker must always be able to do.
      if (!UPCOMING_STATUSES.includes(appointment.status)) {
        throw new HttpError(409, 'This booking can no longer be changed', 409)
      }
    }

    /**
     * A pending booking leaves that state only through
     * `PATCH /provider-profile/bookings/:id/decision`, never through this route.
     *
     * Not a stylistic preference: this route sends no mail. Confirming a queued booking
     * from the Bookings kebab would put it on the calendar and leave the client — who
     * was told their request was being reviewed — with no word either way. The approvals
     * tab is the only surface that offers the verb, and it calls the route that writes
     * *and* tells them.
     */
    if (isProviderOwner && appointment.status === 'pending') {
      throw new HttpError(409, 'Approve or decline this booking from the Approvals tab', 409)
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: requested },
    })

    return ok(res, { id: updated.id, status: updated.status })
  })
)
