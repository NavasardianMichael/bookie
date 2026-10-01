import type { Prisma } from '@prisma/client'
import {
  bookingPeriod,
  bookingsThisMonthWhere,
  type CapNotice,
  getEntitlements,
  hasRoomFor,
  type PlanFields,
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
export const isBookingAllowanceSpent = async (provider: PlanFields & { id: string }, now: Date): Promise<boolean> => {
  const { maxBookingsPerMonth } = getEntitlements(provider, now)
  if (maxBookingsPerMonth === null) return false
  return !hasRoomFor(await countBookingsThisMonth(provider.id, now), maxBookingsPerMonth)
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
