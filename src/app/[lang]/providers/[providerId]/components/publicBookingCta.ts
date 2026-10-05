/**
 * Bridges the identity-column Book now control (layout) with the booking column
 * (page). They are siblings under the segment layout, so a DOM event is the seam —
 * a React context from either side cannot reach the other.
 */

export const PUBLIC_BOOK_NOW_EVENT = 'bookie:public-book-now'

export const BOOKING_SERVICES_ID = 'booking-services'
export const BOOKING_CALENDAR_ID = 'booking-calendar'
export const BOOKING_TIMES_ID = 'booking-times'

export const requestPublicBookNow = (): void => {
  window.dispatchEvent(new Event(PUBLIC_BOOK_NOW_EVENT))
}

export const scrollToBookingSection = (id: string): void => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
