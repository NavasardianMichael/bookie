/**
 * Bridges the identity-column Book now control (layout) with the booking column
 * (page). They are siblings under the segment layout, so a DOM event is the seam —
 * a React context from either side cannot reach the other.
 */

export const PUBLIC_BOOK_NOW_EVENT = 'bookie:public-book-now'

export const BOOKING_SERVICES_ID = 'booking-services'
export const BOOKING_CALENDAR_ID = 'booking-calendar'
export const BOOKING_TIMES_ID = 'booking-times'

/**
 * Where Book now goes next. A service or time that is already selected — including
 * one the page selected because it was the only choice — is not a missing step.
 * The sheet opens only once both are set, and only for a visitor who may book.
 */
export type BookingContinueTarget = 'service' | 'calendar' | 'time' | 'ownPage' | 'confirm'

export const bookingContinueTarget = ({
  hasService,
  hasDay,
  hasTime,
  cannotBookOwn,
}: {
  hasService: boolean
  hasDay: boolean
  hasTime: boolean
  cannotBookOwn: boolean
}): BookingContinueTarget => {
  if (!hasService) return 'service'
  if (!hasDay) return 'calendar'
  if (!hasTime) return 'time'
  if (cannotBookOwn) return 'ownPage'
  return 'confirm'
}

/** The section to bring into view, or null when Book now should open the sheet. */
export const bookingContinueSection = (target: BookingContinueTarget): string | null => {
  switch (target) {
    case 'service':
      return BOOKING_SERVICES_ID
    case 'calendar':
      return BOOKING_CALENDAR_ID
    case 'time':
    case 'ownPage':
      return BOOKING_TIMES_ID
    case 'confirm':
      return null
  }
}

export const requestPublicBookNow = (): void => {
  window.dispatchEvent(new Event(PUBLIC_BOOK_NOW_EVENT))
}

export const scrollToBookingSection = (id: string): void => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
