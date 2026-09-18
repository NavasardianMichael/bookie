export type ProviderAvailabilityStatus = 'available' | 'fullyBlocked' | 'closed'

/**
 * The three states a provider card can show. Remaining-slot math is deliberately
 * not in here — that cannot be answered from the list payload without a per-row
 * availability pass, which Explore refuses (see `src/app/CLAUDE.md`).
 *
 * Pause (`available: false`) wins: a provider who has stopped taking bookings is
 * blocked even if today's weekday still has hours on the schedule.
 */
export const getProviderAvailabilityStatus = (available: boolean, openToday?: boolean): ProviderAvailabilityStatus => {
  if (!available) return 'fullyBlocked'
  if (openToday === false) return 'closed'
  return 'available'
}
