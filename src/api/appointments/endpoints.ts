export const ENDPOINTS = {
  createAppointment: '/appointments',
  listAppointments: '/appointments',
  patchAppointmentStatus: '/appointments',
  /** Public capability-URL reads and writes. Token is interpolated in `main.ts`. */
  manageAppointment: '/appointments/manage',
  /**
   * The provider workspace's own reads. Separate from `listAppointments` because that
   * one answers "what is coming up" unpaged for either role, and these are the paged,
   * filtered, provider-scoped history behind `/providers/profile/bookings`.
   */
  getProviderBookings: '/provider-profile/bookings',
  getProviderBookingsCalendar: '/provider-profile/bookings/calendar',
} as const
