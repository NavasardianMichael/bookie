import { ONLINE_BOOKING } from '@constants/booking'

export type OnlineBooking = (typeof ONLINE_BOOKING)[keyof typeof ONLINE_BOOKING]

/** Why the calendar is closed — `OnlineBooking` without `open`. */
export type BookingClosedReason = Exclude<OnlineBooking, typeof ONLINE_BOOKING.open>
