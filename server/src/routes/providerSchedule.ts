import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { ok } from '../lib/api-response.js'
import { resolveBookingLocale } from '../lib/booking-mail.js'
import { prisma } from '../lib/prisma.js'
import { earliestOpenDayKey, parseScheduleRule, toScheduleRule, toSpecialDates } from '../lib/service-availability.js'
import { toTimeFormat } from '../lib/time-format.js'
import { toTimeZone } from '../lib/time-zone.js'
import { requireProvider } from '../middleware/auth.js'
import { asyncHandler, HttpError } from '../middleware/error.js'
import { rescheduleAppointment } from '../services/appointments.js'
import { notifyRescheduledByProvider } from '../services/bookingNotify.js'
import { refreshProviderSeoStamp } from '../services/providerSeoStamp.js'
import { type ProviderDraft } from '../services/providerWrites.js'
import { applySpecialDateChange, applyWeekChange, parseScheduleChange } from '../services/scheduleWrites.js'

/**
 * Live schedule changes and provider-side reschedules, under `/provider-profile`. Both are what
 * an approved AI-assistant proposal, or the service-conflict dialog, sends: a change the
 * provider has just confirmed, applied at once rather than staged behind Publish.
 */
export const providerScheduleRouter = Router()

const readBool = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined)

/**
 * `PATCH /schedule` — JSON, every key optional:
 * `{ weekSchedule?: { <weekday>: { availability, breaks } }, specialDates?: { set?, remove? },
 *   scheduleRule?, available?, timeZone?, timeFormat? }`.
 * Weekdays given replace those weekdays; special dates are set (trimming any stored run they
 * overlap) or removed (`services/scheduleWrites.ts`). Written **live**.
 *
 * An unpublished Availability draft gets the **same change**, merged onto its own copy: a
 * provider with half-edited hours on the tab keeps their other edits, and the next Publish
 * cannot undo what was just applied. Answers the live schedule.
 */
providerScheduleRouter.patch(
  '/schedule',
  requireProvider,
  asyncHandler(async (req, res) => {
    const providerId = req.session!.profileId
    const now = new Date()
    const today = earliestOpenDayKey(now)
    const parsed = parseScheduleChange(req.body, today)
    if ('error' in parsed) throw new HttpError(400, parsed.error, 400)
    const change = parsed.value

    const available = readBool(req.body?.available)
    const timeZone = req.body?.timeZone === undefined ? undefined : toTimeZone(req.body.timeZone)
    if (timeZone === null) throw new HttpError(400, 'timeZone must be an IANA time zone', 400)
    const timeFormat = req.body?.timeFormat === undefined ? undefined : toTimeFormat(req.body.timeFormat)
    if (timeFormat === null) throw new HttpError(400, 'timeFormat must be h12 or h24', 400)
    const ruleParsed = req.body?.scheduleRule === undefined ? undefined : parseScheduleRule(req.body.scheduleRule)
    if (ruleParsed && 'error' in ruleParsed) throw new HttpError(400, ruleParsed.error, 400)
    const scheduleRule = ruleParsed?.value

    const existing = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { weekSchedule: true, specialDates: true, draft: true },
    })
    if (!existing) throw new HttpError(404, 'Provider profile not found', 404)

    const merge = (week: unknown, special: unknown) => {
      const nextSpecial = change.specialDates
        ? applySpecialDateChange(toSpecialDates(special), change.specialDates, today)
        : undefined
      if (nextSpecial && 'error' in nextSpecial) throw new HttpError(400, nextSpecial.error, 400)
      return {
        weekSchedule: change.weekSchedule ? applyWeekChange(week, change.weekSchedule) : undefined,
        specialDates: nextSpecial?.value,
      }
    }

    const live = merge(existing.weekSchedule, existing.specialDates)
    const draft =
      existing.draft && typeof existing.draft === 'object' && !Array.isArray(existing.draft)
        ? { ...(existing.draft as ProviderDraft) }
        : null
    if (draft) {
      const staged = merge(draft.weekSchedule ?? existing.weekSchedule, draft.specialDates ?? existing.specialDates)
      if ('weekSchedule' in draft && staged.weekSchedule) draft.weekSchedule = staged.weekSchedule
      if ('specialDates' in draft && staged.specialDates) draft.specialDates = staged.specialDates
      if ('available' in draft && available !== undefined) draft.available = available
      if ('timeZone' in draft && timeZone) draft.timeZone = timeZone
      if ('timeFormat' in draft && timeFormat) draft.timeFormat = timeFormat
      if ('scheduleRule' in draft && scheduleRule) draft.scheduleRule = scheduleRule
    }

    const updated = await prisma.provider.update({
      where: { id: providerId },
      data: {
        ...(live.weekSchedule ? { weekSchedule: live.weekSchedule as Prisma.InputJsonValue } : {}),
        ...(live.specialDates ? { specialDates: live.specialDates as unknown as Prisma.InputJsonValue } : {}),
        ...(available !== undefined ? { available } : {}),
        ...(timeZone ? { timeZone } : {}),
        ...(timeFormat ? { timeFormat } : {}),
        ...(scheduleRule ? { scheduleRule: scheduleRule as unknown as Prisma.InputJsonValue } : {}),
        ...(draft ? { draft: draft as Prisma.InputJsonValue } : {}),
      },
      select: {
        weekSchedule: true,
        specialDates: true,
        scheduleRule: true,
        available: true,
        timeZone: true,
        timeFormat: true,
      },
    })
    await refreshProviderSeoStamp(providerId)
    return ok(res, {
      weekSchedule: updated.weekSchedule,
      specialDates: toSpecialDates(updated.specialDates),
      scheduleRule: toScheduleRule(updated.scheduleRule),
      available: updated.available,
      timeZone: updated.timeZone ?? undefined,
      timeFormat: updated.timeFormat ?? undefined,
    })
  })
)

/**
 * `PATCH /bookings/:id/reschedule` — JSON `{ startAt, serviceId?, locale? }`: the provider moves
 * one of their own bookings. The same checks as a client's reschedule (`rescheduleAppointment`:
 * live status, active service, inside the hours, a free slot), then the client is told by email
 * and Telegram. Scoped by session, so another provider's booking is a `404`.
 */
providerScheduleRouter.patch(
  '/bookings/:id/reschedule',
  requireProvider,
  asyncHandler(async (req, res) => {
    const booking = await prisma.appointment.findFirst({
      where: { id: req.params.id, providerId: req.session!.profileId },
      select: { id: true, serviceId: true },
    })
    if (!booking) throw new HttpError(404, 'Booking not found', 404)

    const start = new Date(String(req.body?.startAt ?? ''))
    if (Number.isNaN(start.getTime())) throw new HttpError(400, 'startAt must be an ISO timestamp', 400)
    if (start.getTime() <= Date.now()) throw new HttpError(400, 'Pick a time that has not passed', 400)
    const serviceId = typeof req.body?.serviceId === 'string' && req.body.serviceId ? req.body.serviceId : booking.serviceId

    const updated = await rescheduleAppointment({ appointmentId: booking.id, serviceId, startAt: start })
    void notifyRescheduledByProvider(booking.id, resolveBookingLocale(req.body?.locale))
    return ok(res, { id: updated.id, startAt: updated.startAt.toISOString(), endAt: updated.endAt.toISOString() })
  })
)
