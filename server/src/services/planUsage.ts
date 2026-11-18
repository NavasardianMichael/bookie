import type { AssistantKind, Prisma } from '@prisma/client'
import {
  bookingPeriod,
  bookingsThisMonthWhere,
  type CapNotice,
  type EntitlementFields,
  getEntitlements,
  hasRoomFor,
  photoImportPeriod,
} from './plans.js'
import { prisma } from '../lib/prisma.js'

/**
 * The queries behind `plans.ts` — the same split as `providerSearch.ts` (pure) and
 * `searchFallback.ts` (Prisma): every rule stays where a unit test can reach it, and this
 * file only counts and stamps.
 */

export const countActiveServices = (providerId: string): Promise<number> =>
  prisma.service.count({ where: { providerId, active: true } })

/** Rides `Appointment_providerId_createdAt_idx`. */
export const countBookingsThisMonth = (providerId: string, now: Date): Promise<number> =>
  prisma.appointment.count({ where: bookingsThisMonthWhere(providerId, now) })

/**
 * Whether the provider's monthly booking allowance is spent. One indexed count, and none at
 * all on a plan without a cap — which is every paid plan above Basic, so the public page of
 * most paying providers costs nothing extra.
 */
export const isBookingAllowanceSpent = async (provider: EntitlementFields & { id: string }, now: Date): Promise<boolean> => {
  const { maxBookingsPerMonth } = getEntitlements(provider, now)
  if (maxBookingsPerMonth === null) return false
  return !hasRoomFor(await countBookingsThisMonth(provider.id, now), maxBookingsPerMonth)
}

/** Photos read today (UTC). Rides `PhotoImport_providerId_createdAt_idx`. */
export const countPhotoImportsToday = (providerId: string, now: Date): Promise<number> => {
  const { start, end } = photoImportPeriod(now)
  return prisma.photoImport.count({ where: { providerId, createdAt: { gte: start, lt: end } } })
}

/**
 * Spends one of today's photo imports **before** the read, so two photos sent together cannot
 * both pass a count that saw neither — the window between count and record is a request's
 * width rather than a model call's. Returns the row's id for `releasePhotoImport`.
 */
export const recordPhotoImport = async (providerId: string): Promise<string> =>
  (await prisma.photoImport.create({ data: { providerId }, select: { id: true } })).id

/**
 * Gives a spent import back when the read never happened — a timeout, Google's own rate
 * limit, an outage. A free provider's one photo a day is spent by a photo that was read,
 * not by our upstream having a bad minute.
 */
export const releasePhotoImport = async (id: string): Promise<void> => {
  await prisma.photoImport.deleteMany({ where: { id } })
}

/** The `AssistantUsage` row key for one provider, assistant and UTC day. */
const usageKey = (providerId: string, kind: AssistantKind, now: Date) => ({
  providerId,
  kind,
  day: photoImportPeriod(now).start,
})

/** Messages one assistant has spent today (UTC). */
export const countAssistantMessagesToday = async (providerId: string, kind: AssistantKind, now: Date): Promise<number> => {
  const row = await prisma.assistantUsage.findUnique({ where: { providerId_kind_day: usageKey(providerId, kind, now) } })
  return row?.count ?? 0
}

/**
 * Spends one of today's messages **before** the model call, if any are left — a conditional
 * increment, so two messages sent together cannot both pass a count that saw neither (the
 * `where` is the lock, as for the allowance stamps). `limit` `null` is unlimited. Answers
 * whether a message was spent; `false` means the allowance is gone.
 */
export const spendAssistantMessage = async (
  providerId: string,
  kind: AssistantKind,
  limit: number | null,
  now: Date
): Promise<boolean> => {
  const key = usageKey(providerId, kind, now)
  await prisma.assistantUsage.upsert({ where: { providerId_kind_day: key }, create: key, update: {} })
  const { count } = await prisma.assistantUsage.updateMany({
    where: { ...key, ...(limit === null ? {} : { count: { lt: limit } }) },
    data: { count: { increment: 1 } },
  })
  return count === 1
}

/**
 * Gives a spent message back when no answer came of it — a timeout, Google's own rate limit,
 * an outage — `releasePhotoImport`'s reasoning. Never below zero.
 */
export const releaseAssistantMessage = async (providerId: string, kind: AssistantKind, now: Date): Promise<void> => {
  await prisma.assistantUsage.updateMany({
    where: { ...usageKey(providerId, kind, now), count: { gt: 0 } },
    data: { count: { decrement: 1 } },
  })
}

/**
 * Claims this month's allowance notice for exactly one caller.
 *
 * A compare-and-set rather than read-then-write: two bookings landing together both see
 * the threshold crossed, and only the one whose `updateMany` flips the stamp sends — the
 * other matches no row. No transaction needed, because the `where` is the lock.
 *
 * Claiming `reached` stamps the warning too, so a later cancellation that dips back under
 * the limit cannot then send a stray 80% email the same month.
 */
export const claimCapNotice = async (providerId: string, notice: CapNotice, now: Date): Promise<boolean> => {
  const { start } = bookingPeriod(now)
  const where: Prisma.ProviderWhereInput =
    notice === 'warned'
      ? { id: providerId, OR: [{ bookingCapWarnedAt: null }, { bookingCapWarnedAt: { lt: start } }] }
      : { id: providerId, OR: [{ bookingCapReachedAt: null }, { bookingCapReachedAt: { lt: start } }] }

  const { count } = await prisma.provider.updateMany({
    where,
    data: notice === 'warned' ? { bookingCapWarnedAt: now } : { bookingCapReachedAt: now, bookingCapWarnedAt: now },
  })
  return count === 1
}
