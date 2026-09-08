import { toPaymentMethods } from '../lib/payment.js'
import { prisma } from '../lib/prisma.js'
import { HttpError } from '../middleware/error.js'

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

type DaySchedule = {
  availability?: { start?: string; end?: string }
  breaks?: { start: string; end: string }[]
}

type WeekSchedule = Record<string, DaySchedule>

function parseTimeOnDate(date: Date, time: string) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

export async function getProviderAvailability(providerId: string, dateStr: string) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } })
  if (!provider) throw new HttpError(404, 'Provider not found', 404)

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'Invalid date', 400)

  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEndBound = new Date(date)
  dayEndBound.setHours(23, 59, 59, 999)

  const dayKey = DAY_KEYS[date.getDay()]!
  const schedule = (provider.weekSchedule as WeekSchedule) ?? {}
  const day = schedule[dayKey]
  const startStr = day?.availability?.start
  const endStr = day?.availability?.end

  if (!startStr || !endStr) return []

  const workStart = parseTimeOnDate(date, startStr)
  const workEnd = parseTimeOnDate(date, endStr)

  const appointments = await prisma.appointment.findMany({
    where: {
      providerId,
      startAt: { gte: dayStart, lte: dayEndBound },
      status: { in: ['scheduled', 'confirmed'] },
    },
  })

  const slots: { start: string; end: string }[] = []
  const slotMinutes = 30
  let cursor = new Date(workStart)
  const now = new Date()

  while (cursor < workEnd) {
    const slotEnd = addMinutes(cursor, slotMinutes)
    if (slotEnd > workEnd) break
    if (cursor <= now) {
      cursor = addMinutes(cursor, slotMinutes)
      continue
    }

    const inBreak = (day.breaks ?? []).some((brk) => {
      if (!brk.start || !brk.end) return false
      return overlaps(cursor, slotEnd, parseTimeOnDate(date, brk.start), parseTimeOnDate(date, brk.end))
    })
    const booked = appointments.some((a) => overlaps(cursor, slotEnd, a.startAt, a.endAt))
    if (!inBreak && !booked) {
      slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() })
    }
    cursor = addMinutes(cursor, slotMinutes)
  }

  return slots
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

  const endAt = addMinutes(input.startAt, service.durationMinutes)

  const conflict = await prisma.appointment.findFirst({
    where: {
      providerId: input.providerId,
      status: { in: ['scheduled', 'confirmed'] },
      OR: [
        { startAt: { lte: input.startAt }, endAt: { gt: input.startAt } },
        { startAt: { lt: endAt }, endAt: { gte: endAt } },
        { startAt: { gte: input.startAt }, endAt: { lte: endAt } },
      ],
    },
  })

  if (conflict) throw new HttpError(409, 'Time slot not available', 409)

  const provider = await prisma.provider.findUnique({ where: { id: input.providerId } })

  // The client only offers what the provider accepts; this is what makes that true
  // rather than merely likely. A provider who has configured nothing accepts anything.
  const accepted = toPaymentMethods(provider?.paymentInfo)
  const requested = toPaymentMethods({ methods: input.paymentMethods ?? [] })
  const paymentMethods = accepted.length ? requested.filter((m) => accepted.includes(m)) : requested

  return prisma.appointment.create({
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
      status: 'scheduled',
      notes: input.notes,
      paymentMethods,
    },
  })
}
