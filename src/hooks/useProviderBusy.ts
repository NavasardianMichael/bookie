'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProviderBusyAPI } from '@api/providers/main'
import { BusyInterval } from '@helpers/booking'
import { draftMonthWindow } from '@helpers/bookingImport'

export type ProviderBusy = {
  /** Live bookings across every month loaded so far. Overlapping windows may repeat one; harmless. */
  busy: BusyInterval[]
  /** True while a month the caller asked for has not arrived yet. */
  loading: boolean
  error: unknown
  /** Re-reads the months that failed. */
  retry: () => void
  /** Forgets every month and reads them again — after a submit learned that a slot went. */
  refresh: () => void
}

/**
 * The provider's bookings around the given months (`YYYY-MM`), from `GET /providers/:id/busy` —
 * the read the public booking grid uses, which answers its owner even for an unlisted page.
 * Each month is read once and kept, so moving a row to another day of a loaded month costs
 * nothing, and moving it into a new month reads only that month.
 *
 * `loading` is derived from what is missing rather than set before the fetch, the rule the
 * Bookings panels follow (`docs/routes/bookings-and-favorites.md`): state is only ever written from the request's
 * own callbacks.
 */
export const useProviderBusy = (providerId: string | null, months: readonly string[]): ProviderBusy => {
  const [byMonth, setByMonth] = useState<Readonly<Record<string, BusyInterval[]>>>({})
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  // Keyed on the joined list, so a caller's fresh array of the same months is not a new request.
  const monthsKey = months.join(',')
  const missing = useMemo(
    () => (monthsKey ? monthsKey.split(',') : []).filter((month) => !(month in byMonth)),
    [monthsKey, byMonth]
  )

  useEffect(() => {
    if (!providerId || !missing.length || error !== null) return
    let cancelled = false

    void Promise.all(
      missing.map(async (month) => {
        const intervals = await getProviderBusyAPI({ id: providerId, ...draftMonthWindow(month) })
        return [month, intervals] as const
      })
    )
      .then((entries) => {
        if (!cancelled) setByMonth((current) => ({ ...current, ...Object.fromEntries(entries) }))
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason)
      })

    return () => {
      cancelled = true
    }
    // `attempt` re-runs the read after a failure cleared by `retry`.
  }, [providerId, missing, error, attempt])

  const busy = useMemo(() => Object.values(byMonth).flat(), [byMonth])

  const retry = useCallback(() => {
    setError(null)
    setAttempt((current) => current + 1)
  }, [])

  const refresh = useCallback(() => {
    setByMonth({})
    setError(null)
  }, [])

  return { busy, loading: Boolean(providerId) && missing.length > 0 && error === null, error, retry, refresh }
}
