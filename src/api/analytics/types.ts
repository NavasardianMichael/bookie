import { Endpoint } from '@interfaces/api'

/**
 * A money total in one currency.
 *
 * Revenue is **never** a single number. `Service.currency` is free-form text, so a
 * provider whose services are priced in two currencies has no combined total — adding
 * them would be a wrong answer rather than an approximate one. The page leads with the
 * largest and says plainly when there is more than one.
 */
export type CurrencyTotal = {
  currency: string
  total: number
}

export type AnalyticsTotals = {
  bookings: number
  completed: number
  cancelled: number
  noShow: number
  revenue: CurrencyTotal[]
}

/**
 * Taken over *settled* bookings only — completed, cancelled or no-showed. Null when
 * none are settled yet, which is why these are nullable rather than `0`: a brand-new
 * provider has no completion rate, and rendering 0% would read as a failure.
 */
export type AnalyticsRates = {
  completion: number | null
  cancellation: number | null
  noShow: number | null
}

export type AnalyticsSeriesPoint = {
  /** `YYYY-MM-DD` in the requested timezone. Zero-filled, so a chart has no gaps. */
  day: string
  bookings: number
  completed: number
}

export type AnalyticsServiceRow = {
  serviceId: string
  bookings: number
  revenue: CurrencyTotal[]
}

export type ProviderAnalytics = {
  range: { from: string; to: string }
  timeZone: string
  totals: AnalyticsTotals
  /** The same totals over the equal-length window immediately before the range. */
  previous: AnalyticsTotals
  rates: AnalyticsRates
  series: AnalyticsSeriesPoint[]
  topServices: AnalyticsServiceRow[]
  /** Monday-first, matching `WEEK_DAYS_LIST` and every schedule in the app. */
  byWeekday: { weekday: number; bookings: number }[]
  byHour: { hour: number; bookings: number }[]
  clients: { total: number; returning: number }
  medianLeadTimeHours: number | null
}

export type ProviderAnalyticsQuery = {
  /** ISO instants. Omitted means the API's default window. */
  from?: string
  to?: string
}

export type GetProviderAnalyticsAPI = Endpoint<{
  payload: ProviderAnalyticsQuery | void
  response: ProviderAnalytics
  processed: ProviderAnalytics
}>
