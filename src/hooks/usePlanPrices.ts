'use client'

import { useEffect, useState } from 'react'
import { getPlanPricesAPI } from '@api/billing/main'
import { LocalizedPlanPrices } from '@api/billing/types'
import { reportError } from '@helpers/reportError'

/**
 * One request per page, however many price cells ask: the comparison table renders a
 * `PlanPrice` island per column, and four identical calls would each spend a Paddle preview.
 * Shared through a module-level promise for the life of the page; a full navigation starts
 * a fresh one, so the visitor's location is re-read.
 */
let pending: Promise<LocalizedPlanPrices | null> | null = null

const loadPrices = (): Promise<LocalizedPlanPrices | null> => {
  pending ??= getPlanPricesAPI().catch((error: unknown) => {
    // Decorative: every cell already shows the USD price, which stays on screen.
    reportError(error, 'plan prices')
    return null
  })
  return pending
}

/**
 * Each paid plan's monthly total in the visitor's currency, tax included, as Paddle would
 * charge it — or `null` until it arrives, and for good when Paddle is unconfigured or cannot
 * place the visitor. Callers show the USD fallback for any `null`.
 */
export const usePlanPrices = (): LocalizedPlanPrices | null => {
  const [prices, setPrices] = useState<LocalizedPlanPrices | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadPrices().then((loaded) => {
      if (!cancelled) setPrices(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return prices
}
