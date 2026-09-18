export const ENDPOINTS = {
  createAppointment: '/appointments',
  listAppointments: '/appointments',
  patchAppointmentStatus: '/appointments',
  /** Public capability-URL reads and writes. Token is interpolated in `main.ts`. */
  manageAppointment: '/appointments/manage',
  /**
   * The provider workspace's own reads. Separate from `listAppointments` because that
   * one answers "what is coming up" unpaged for either role, and these are the paged,
   * filtered, provider-scoped list behind `/providers/profile/bookings`.
   */
  getProviderBookings: '/provider-profile/bookings',
  getProviderBookingsCalendar: '/provider-profile/bookings/calendar',
  /**
   * Same paged shape as `getProviderBookings`, scoped to appointments this User
   * booked as a client. Empty when they have no Consumer row yet.
   */
  getProviderConsumerBookings: '/provider-profile/consumer-bookings',
  getProviderConsumerBookingsCalendar: '/provider-profile/consumer-bookings/calendar',
} as const
