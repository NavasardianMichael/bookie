import { SLOT_TAKEN_MESSAGE } from '../lib/booking-errors.js'
import { toPaymentMethods } from '../lib/payment.js'
import { prisma } from '../lib/prisma.js'
import { hashUrlToken, mintUrlToken } from '../lib/token.js'
import { HttpError } from '../middleware/error.js'

/**
 * The statuses that hold a slot. `pending` is one of them: a booking waiting on the
 * provider's decision has already taken its time, or the second person to ask would be
 * offered a slot the provider then has to refuse.
 *
 * Read by the overlap check *and* by `getProviderBusyIntervals`, from this one
 * declaration — the grid a visitor sees and the guard that rejects their submit must
 * never be able to disagree about what "taken" means.
 */
const LIVE_STATUSES = ['pending', 'scheduled', 'confirmed'] as const


function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

/**
 * Bookings that already hold a slot, within a window.
 *
 * This replaced `getProviderAvailability`, which built its own 30-minute slot grid that
 * nothing ever called — `BookingPanel` computes slots client-side from `weekSchedule`,
 * stepped by the *selected service's* duration. Two engines that disagreed about what a
 * slot even is (`docs/BACKLOG.md` #6): the server's grid could not answer for a 45-minute
 * service, so the UI ignored it, and the UI in turn subtracted nothing — every visitor
 * saw every in-hours time as free and found out otherwise from a 409.
 *
 * So the split is by *responsibility* rather than by layer: the client owns stepping
 * (it knows the service), the server owns what is taken (it owns the rows). This returns
 * intervals, not slots, which is the only shape that does not presuppose a step.
 *
 * It is a **public** read on a public page, so it carries instants and nothing else —
 * no id, no service, no booker. What it discloses is exactly what the grid already
 * shows once it renders: which times are unavailable.
 */
export async function getProviderBusyIntervals(providerId: string, from: Date, to: Date) {
  const appointments = await prisma.appointment.findMany({
    where: {
      providerId,
      status: { in: [...LIVE_STATUSES] },
      // Any overlap with the window, not merely a start inside it: a booking that began
      // before `from` and runs past it still blocks the window's first slots.
      startAt: { lt: to },
      endAt: { gt: from },
    },
    select: { startAt: true, endAt: true },
    orderBy: { startAt: 'asc' },
  })

  return appointments.map((a) => ({ startAt: a.startAt.toISOString(), endAt: a.endAt.toISOString() }))
}

/** Contact details for a booking made without an account. */
export type GuestBooker = {
  firstName: string
  lastName: string
  phoneCode: number
  phoneNumber: bigint
  email?: string
}

export async function createAppointment(input: {
  /** Exactly one of `consumerId` / `guest` — the caller decides which from the session. */
  consumerId?: string
  guest?: GuestBooker
  providerId: string
  serviceId: string
  startAt: Date
  notes?: string
  paymentMethods?: string[]
}) {
  if (!input.consumerId && !input.guest) {
    throw new HttpError(400, 'A booking needs either a consumer or guest details', 400)
  }

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, providerId: input.providerId },
  })
  if (!service) throw new HttpError(404, 'Service not found', 404)
  if (!service.active) throw new HttpError(409, 'This service is no longer available', 409)

  const endAt = addMinutes(input.startAt, service.durationMinutes)

  const conflict = await findOverlappingAppointment({
    providerId: input.providerId,
    startAt: input.startAt,
    endAt,
  })

  // `SLOT_TAKEN_MESSAGE`, not a sentence written here: the client matches on it to tell
  // "someone got there first" apart from every other 409 this route can answer — a
  // withdrawn service included — and a second spelling degrades that back to a generic
  // red toast. `lib/booking-errors.ts` explains why it lives in a module of its own.
  if (conflict) throw new HttpError(409, SLOT_TAKEN_MESSAGE, 409)

  const provider = await prisma.provider.findUnique({ where: { id: input.providerId } })

  /**
   * The approval gate. `pending` waits for the owner's decision on the approvals tab;
   * `scheduled` is on the calendar the moment it is written.
   *
   * The slot is held either way — `LIVE_STATUSES` covers both — so this decides who
   * sees the booking first, never whether the time is taken. A provider who has not
   * turned the setting on keeps exactly the behaviour they had.
   */
  const requiresApproval = provider?.requiresBookingApproval === true

  // The client only offers what the provider accepts; this is what makes that true
  // rather than merely likely. A provider who has configured nothing accepts anything.
  const accepted = toPaymentMethods(provider?.paymentInfo)
  const requested = toPaymentMethods({ methods: input.paymentMethods ?? [] })
  const paymentMethods = accepted.length ? requested.filter((m) => accepted.includes(m)) : requested

  const manageToken = mintUrlToken()
  const appointment = await prisma.appointment.create({
    data: {
      consumerId: input.consumerId,
      guestFirstName: input.guest?.firstName,
      guestLastName: input.guest?.lastName,
      guestPhoneCode: input.guest?.phoneCode,
      guestPhoneNumber: input.guest?.phoneNumber,
      guestEmail: input.guest?.email,
      providerId: input.providerId,
      serviceId: input.serviceId,
      organizationId: provider?.organizationId,
      startAt: input.startAt,
      endAt,
      durationMinutes: service.durationMinutes,
      // Snapshotted alongside the duration, and for the same reason: what was agreed
      // must not change when the price list does.
      price: service.price,
      currency: service.currency,
      status: requiresApproval ? 'pending' : 'scheduled',
      notes: input.notes,
      paymentMethods,
      manageTokenHash: hashUrlToken(manageToken),
    },
  })

  return { appointment, manageToken, requiresApproval }
}

/**
 * Overlap against live bookings. `excludeId` lets a reschedule keep its own slot
 * rather than 409ing against itself.
 */
async function findOverlappingAppointment(input: {
  providerId: string
  startAt: Date
  endAt: Date
  excludeId?: string
}) {
  return prisma.appointment.findFirst({
    where: {
      providerId: input.providerId,
      status: { in: [...LIVE_STATUSES] },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      OR: [
        { startAt: { lte: input.startAt }, endAt: { gt: input.startAt } },
        { startAt: { lt: input.endAt }, endAt: { gte: input.endAt } },
        { startAt: { gte: input.startAt }, endAt: { lte: input.endAt } },
      ],
    },
  })
}

export async function rescheduleAppointment(input: {
  appointmentId: string
  serviceId: string
  startAt: Date
}) {
  const appointment = await prisma.appointment.findUnique({ where: { id: input.appointmentId } })
  if (!appointment) throw new HttpError(404, 'Appointment not found', 404)

  // `LIVE_STATUSES` rather than a hand-written pair: a booking awaiting approval is
  // still upcoming, and the person who made it must be able to move or drop it while
  // the provider is deciding. Spelling the list out here is how the two drift.
  if (!LIVE_STATUSES.includes(appointment.status as (typeof LIVE_STATUSES)[number])) {
    throw new HttpError(409, 'This booking can no longer be changed', 409)
  }

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, providerId: appointment.providerId },
  })
  if (!service) throw new HttpError(404, 'Service not found', 404)
  if (!service.active) throw new HttpError(409, 'This service is no longer available', 409)

  const endAt = addMinutes(input.startAt, service.durationMinutes)

  const conflict = await findOverlappingAppointment({
    providerId: appointment.providerId,
    startAt: input.startAt,
    endAt,
    excludeId: appointment.id,
  })
  if (conflict) throw new HttpError(409, SLOT_TAKEN_MESSAGE, 409)

  return prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      serviceId: service.id,
      startAt: input.startAt,
      endAt,
      durationMinutes: service.durationMinutes,
      price: service.price,
      currency: service.currency,
    },
  })
}
