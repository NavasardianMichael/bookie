/**
 * The service form's availability choices. The form's `recurring` splits into two stored
 * modes (`weekdays`, `monthDays`); `ServiceAvailability` in the store types is what the
 * API holds. A service picks days and, optionally, hours — always inside the provider's.
 */
export const SERVICE_AVAILABILITY_MODES = {
  always: 'always',
  recurring: 'recurring',
  dates: 'dates',
} as const

export const SERVICE_AVAILABILITY_MODES_LIST = Object.values(SERVICE_AVAILABILITY_MODES)

export const SERVICE_RECURRENCES = {
  weekdays: 'weekdays',
  monthDays: 'monthDays',
} as const

export const SERVICE_RECURRENCES_LIST = Object.values(SERVICE_RECURRENCES)

/** Every day a month can have. One the month lacks (31 in April) is skipped that month. */
export const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

/** Mirrors the API's cap (`MAX_SERVICE_DATES`): a year of single dates. */
export const MAX_SERVICE_DATES = 366

/** Mirrors the API's cap (`MAX_SERVICE_EXCEPTIONS`): a service's added and excluded dates together. */
export const MAX_SERVICE_EXCEPTIONS = 100
