import { SpecialDate } from '@store/providers/profile/types'
import { addDaysToDayKey } from './serviceAvailability'

/**
 * The editor's rules for a provider's special dates (`Provider.specialDates`) — the server
 * refuses the same (`server/src/lib/service-availability.ts#parseSpecialDates`).
 */

/** Entries a provider may hold at once, the longest run one may cover, a note's length. */
export const MAX_SPECIAL_DATES = 100
export const MAX_SPECIAL_DATE_SPAN_DAYS = 366
export const SPECIAL_DATE_NOTE_MAX = 80

/** Sorted by first day, without any that ended before `todayKey`. */
export const upcomingSpecialDates = (entries: readonly SpecialDate[], todayKey: string): SpecialDate[] =>
  entries.filter((entry) => entry.to >= todayKey).sort((a, b) => a.from.localeCompare(b.from))

/**
 * The entry `candidate` would overlap, other than the one being edited (`editingFrom`, its
 * `from` before the edit) — two entries for one day would leave which one wins to chance.
 */
export const overlappingSpecialDate = (
  entries: readonly SpecialDate[],
  candidate: Pick<SpecialDate, 'from' | 'to'>,
  editingFrom?: string
): SpecialDate | undefined =>
  entries.find((entry) => entry.from !== editingFrom && entry.from <= candidate.to && candidate.from <= entry.to)

/** `entries` with `next` in place of the entry that started on `editingFrom` (or added), sorted. */
export const replaceSpecialDate = (
  entries: readonly SpecialDate[],
  next: SpecialDate,
  editingFrom?: string
): SpecialDate[] =>
  [...entries.filter((entry) => entry.from !== editingFrom), next].sort((a, b) => a.from.localeCompare(b.from))

/**
 * `current` with a schedule change applied, as `PATCH /provider-profile/schedule` will store it
 * (`server/src/services/scheduleWrites.ts#applySpecialDateChange`): an entry covering any `remove`
 * date goes, and each `set` entry trims the stored runs it overlaps — a vacation set over one
 * day of a longer run keeps the days either side. Sorted by first day.
 */
export const applySpecialDateChange = (
  current: readonly SpecialDate[],
  change: { set?: readonly SpecialDate[]; remove?: readonly string[] }
): SpecialDate[] => {
  const remove = change.remove ?? []
  let next = current.filter((entry) => !remove.some((date) => entry.from <= date && date <= entry.to))
  for (const entry of change.set ?? []) {
    next = next.flatMap((existing): SpecialDate[] => {
      if (existing.to < entry.from || existing.from > entry.to) return [existing]
      return [
        ...(existing.from < entry.from ? [{ ...existing, to: addDaysToDayKey(entry.from, -1) }] : []),
        ...(existing.to > entry.to ? [{ ...existing, from: addDaysToDayKey(entry.to, 1) }] : []),
      ]
    })
    next.push(entry)
  }
  return next.sort((a, b) => a.from.localeCompare(b.from))
}
