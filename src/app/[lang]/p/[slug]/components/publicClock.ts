import { TimeFormat } from '@interfaces/schedule'

/**
 * The clock the visitor picked on the public profile: a whole-hour offset and a
 * 12/24-hour choice. `null` means the provider's own. One store so the slot grid
 * and the opening hours reprint together — they sit in different columns, so React
 * state in the booking panel cannot reach the hours list.
 *
 * A module store rather than context: the hours list renders in the segment layout
 * and the controls render in the page, and a context provider would have to wrap
 * both from the layout while the selected day is known only inside the panel.
 * The server snapshot stays on the provider's clock, which is what the document
 * shows a crawler. Effects never run there, so concurrent requests cannot see
 * each other's pick.
 */
export type PublicClock = {
  offsetHours: number | null
  timeFormat: TimeFormat | null
  /** The calendar day the offset is read against. Null until the panel knows which day is on screen. */
  referenceDayKey: string | null
}

const EMPTY: PublicClock = { offsetHours: null, timeFormat: null, referenceDayKey: null }

let current: PublicClock = EMPTY
const listeners = new Set<() => void>()

export const subscribePublicClock = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getPublicClock = (): PublicClock => current

/** Stable snapshot for the server render and hydration. The visitor has not picked yet. */
export const getServerPublicClock = (): PublicClock => EMPTY

export const publishPublicClock = (patch: Partial<PublicClock>): void => {
  const next: PublicClock = { ...current, ...patch }
  if (
    next.offsetHours === current.offsetHours &&
    next.timeFormat === current.timeFormat &&
    next.referenceDayKey === current.referenceDayKey
  ) {
    return
  }
  current = next
  listeners.forEach((listener) => listener())
}
