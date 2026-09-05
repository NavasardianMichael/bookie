import { PropsWithChildren } from 'react'

/**
 * Deliberately a pass-through.
 *
 * The funnel's white card used to live here, but Next nested layouts compose rather than
 * replace, so `/auth/consumer-registration` — a full-bleed two-column split with no card —
 * could never opt out of it. Each step now reaches for `AuthCard` itself
 * (`@components/ui/layout`), which keeps the card one import away without making it
 * mandatory for the whole segment.
 */
export default function AuthLayout({ children }: PropsWithChildren) {
  return children
}
