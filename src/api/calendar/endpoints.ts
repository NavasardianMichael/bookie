export const ENDPOINTS = {
  /** The provider's private iCal feed URL. */
  getCalendarFeed: '/provider-profile/calendar-feed',
  /** Revokes the current feed URL and answers the new one. */
  rotateCalendarFeed: '/provider-profile/calendar-feed/rotate',
} as const
