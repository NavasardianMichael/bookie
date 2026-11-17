import { sendGAEvent } from '@next/third-parties/google'
import { GA_MEASUREMENT_ID } from '@constants/monitoring'

/**
 * Page views are GA4's own — the initial load and every history change — through
 * `components/analytics/Analytics.tsx`. This is for the moments a page view cannot show.
 * GA4's recommended names where one exists (`login`, `sign_up`, `purchase`).
 */
export type AnalyticsEvent = 'login' | 'sign_up' | 'booking_created' | 'begin_checkout' | 'purchase'

/** A no-op while `NEXT_PUBLIC_GA_MEASUREMENT_ID` is unset. Never pass an email, name or other PII. */
export const trackEvent = (event: AnalyticsEvent, params: Record<string, string | number | boolean> = {}): void => {
  if (GA_MEASUREMENT_ID) sendGAEvent('event', event, params)
}
