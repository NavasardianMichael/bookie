import type { Prisma } from '@prisma/client'
import { findBatchClashes, type ImportRow } from './bookingImport.js'
import { ENTITLEMENT_SELECT, getEntitlements } from './plans.js'
import { countBookingsThisMonth, isBookingAllowanceSpent } from './planUsage.js'
import { BOOKING_ERROR, SLOT_TAKEN_MESSAGE } from '../lib/booking-errors.js'
import { toPaymentMethods } from '../lib/payment.js'
import { PLAN_ERROR } from '../lib/plan-errors.js'
import { prisma } from '../lib/prisma.js'
import { isWithinBookableHours, toServiceAvailability } from '../lib/service-availability.js'
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
export const LIVE_STATUSES = ['pending', 'scheduled', 'confirmed'] as const


function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

const OUTSIDE_HOURS_MESSAGE = 'This service is not offered at that time'

/**
 * Refuses a time the service is not offered at — outside the provider's hours, or outside
 * the service's own days and hours inside them (`lib/service-availability.ts`). The grid
 * never offers such a time; this is what makes the public route agree with it.
 */
function assertBookableHours(input: {
  provider: { weekSchedule: Prisma.JsonValue; timeZone: string | null } | null
  service: { availability: Prisma.JsonValue }
  startAt: Date
  endAt: Date
}): void {
  if (!input.provider) return
  const fits = isWithinBookableHours({
    weekSchedule: input.provider.weekSchedule,
    availability: toServiceAvailability(input.service.availability),
    timeZone: input.provider.timeZone,
    startAt: input.startAt,
    endAt: input.endAt,
  })
  if (!fits) throw new HttpError(409, OUTSIDE_HOURS_MESSAGE, BOOKING_ERROR.outsideHours)
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
 * intervals, not slots, which is the only shape that does not presuppose a step. The
 * server does check that a booking *fits* the hours the service is offered at
 * (`assertBookableHours`) — fit, not the step.
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
  fullName: string
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

  // `addons`: the booking allowance below is an entitlement, and a pack can raise it.
  const provider = await prisma.provider.findUnique({
    where: { id: input.providerId },
    include: { addons: { select: ENTITLEMENT_SELECT.addons.select } },
  })

  /**
   * `available: false` is the provider's own "pause new bookings" switch. It used to be
   * read by Explore alone — the card's Fully blocked pill, the filter, the sort — while
   * this write ignored it, so a paused provider kept receiving bookings from anyone who
   * opened their page. Checked before the overlap: "pick another time" is no help when
   * no time will do.
   */
  if (provider?.available === false) {
    throw new HttpError(409, 'This provider is not taking online bookings right now', BOOKING_ERROR.bookingPaused)
  }

  /**
   * The plan's monthly allowance (`services/plans.ts`). A soft cap: the count and the insert
   * are not one transaction, so two submits in the same instant can take it one past —
   * the same race the overlap check below already accepts (docs/BACKLOG.md). The visitor
   * is told only that online booking is closed this month, never why.
   */
  if (provider && (await isBookingAllowanceSpent(provider, new Date()))) {
    throw new HttpError(409, 'This provider cannot take more online bookings this month', BOOKING_ERROR.bookingFull)
  }

  const endAt = addMinutes(input.startAt, service.durationMinutes)
  assertBookableHours({ provider, service, startAt: input.startAt, endAt })

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
      guestFullName: input.guest?.fullName,
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
 * rather than 409ing against itself. `db` is a transaction client when the check has to
 * sit inside the same transaction as the write it guards (`createProviderAppointments`).
 */
async function findOverlappingAppointment(
  input: {
    providerId: string
    startAt: Date
    endAt: Date
    excludeId?: string
  },
  db: Pick<Prisma.TransactionClient, 'appointment'> = prisma
) {
  return db.appointment.findFirst({
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

/**
 * Bookings a provider enters for their own clients — the photo import's last step
 * (`POST /provider-profile/bookings/import`). All or nothing: the review sheet promised the
 * whole batch, so a batch that cannot all go in goes in not at all, and the provider fixes
 * the row the sheet now flags.
 *
 * Not `createAppointment`, because two of its rules are about *visitors* and do not apply
 * to the provider writing in their own diary:
 *
 * - **`available: false` does not refuse.** It pauses *online* booking; a provider recording
 *   a client they took by phone is exactly what they do while it is paused.
 * - **Never `pending`.** Approval is the provider's decision, and they have made it. Written
 *   `scheduled`, the one "on the calendar" state (docs/DATABASE_STRUCTURE.md → Booking approval).
 *
 * What does apply: the service is theirs and active, the time is in the future, inside the
 * hours the service is offered at, and free — against live bookings and against the batch
 * itself — and the plan's monthly allowance has room for every row, because these are
 * bookings like any other and count like them. How the day is stepped stays the client's
 * rule, as it is for the public route: the server checks a booking *fits*, not that it
 * starts on a grid line.
 *
 * The overlap reads and the insert share one transaction. That does not lock out a visitor
 * booking the same slot in the same instant — no route here does (docs/BACKLOG.md) — but it
 * does mean a refusal leaves nothing half-written.
 *
 * Guest columns carry the client, as a booking without an account always has. No email
 * goes anywhere: the provider made these, and the client gave no address.
 */
export async function createProviderAppointments(providerId: string, rows: readonly ImportRow[], now: Date) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, organizationId: true, weekSchedule: true, timeZone: true, ...ENTITLEMENT_SELECT },
  })
  if (!provider) throw new HttpError(404, 'Provider not found', 404)

  const services = await prisma.service.findMany({
    where: { providerId, id: { in: [...new Set(rows.map((row) => row.serviceId))] } },
  })
  const serviceById = new Map(services.map((service) => [service.id, service]))

  const timed = rows.map((row) => {
    const service = serviceById.get(row.serviceId)
    if (!service) throw new HttpError(404, 'Service not found', 404)
    if (!service.active) throw new HttpError(409, 'This service is no longer available', 409)
    if (row.startAt <= now) throw new HttpError(400, 'A booking cannot start in the past', 400)
    const endAt = addMinutes(row.startAt, service.durationMinutes)
    assertBookableHours({ provider, service, startAt: row.startAt, endAt })
    return { row, service, endAt }
  })

  if (findBatchClashes(timed.map(({ row, endAt }) => ({ startAt: row.startAt, endAt }))).length) {
    throw new HttpError(409, SLOT_TAKEN_MESSAGE, 409)
  }

  // A plan answer, not `BOOKING_ERROR.bookingFull`: that code is worded for a visitor, who
  // must never hear about a plan. The provider is the one who pays, so they are told.
  const { maxBookingsPerMonth } = getEntitlements(provider, now)
  if (maxBookingsPerMonth !== null && (await countBookingsThisMonth(providerId, now)) + rows.length > maxBookingsPerMonth) {
    throw new HttpError(
      403,
      `Your plan includes ${maxBookingsPerMonth} bookings a month, and these would take you past it.`,
      PLAN_ERROR.bookingLimit
    )
  }

  return prisma.$transaction(async (tx) => {
    for (const { row, endAt } of timed) {
      if (await findOverlappingAppointment({ providerId, startAt: row.startAt, endAt }, tx)) {
        throw new HttpError(409, SLOT_TAKEN_MESSAGE, 409)
      }
    }

    const { count } = await tx.appointment.createMany({
      data: timed.map(({ row, service, endAt }) => ({
        guestFullName: row.fullName,
        guestPhoneCode: row.phoneCode,
        guestPhoneNumber: row.phoneNumber,
        providerId,
        serviceId: service.id,
        organizationId: provider.organizationId,
        startAt: row.startAt,
        endAt,
        durationMinutes: service.durationMinutes,
        price: service.price,
        currency: service.currency,
        status: 'scheduled' as const,
        notes: row.notes,
        // Every booking carries a manage capability, as `createAppointment`'s do. Nobody is
        // sent this one, but the column is required and the provider's own views assume it.
        manageTokenHash: hashUrlToken(mintUrlToken()),
      })),
    })
    return count
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
  const provider = await prisma.provider.findUnique({
    where: { id: appointment.providerId },
    select: { weekSchedule: true, timeZone: true },
  })
  assertBookableHours({ provider, service, startAt: input.startAt, endAt })

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
      // A new time is reminded of afresh: a reminder sent for the old one said the wrong time.
      providerRemindedAt: null,
      bookerRemindedAt: null,
    },
  })
}
