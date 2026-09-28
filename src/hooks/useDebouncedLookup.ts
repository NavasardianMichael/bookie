'use client'

import { useEffect, useState } from 'react'
import { reportError } from '@helpers/reportError'

type Answer<TRequest, TResult> = {
  request: TRequest
  result: TResult | undefined
  failed: boolean
}

export type DebouncedLookup<TResult> = {
  /** The latest answer — kept up while the next one is in flight. */
  result: TResult | undefined
  /** No request: the text is too short to search, so there is nothing to say. */
  isIdle: boolean
  isLoading: boolean
  /** The latest request failed. A lookup is a shortcut, so the caller degrades rather than errors. */
  failed: boolean
}

type Options = {
  delayMs: number
  /** Passed to `reportError`, so a failure is findable in the log. */
  errorContext: string
}

/**
 * A search-as-you-type dropdown's fetch: the Explore search box and the registration
 * Organization field.
 *
 * The caller memoizes `request` into a value that doubles as its identity (`null` for
 * "nothing to ask"), and `isLoading` is derived by comparing it with the last answered one
 * rather than set at the top of the effect. The debounce is the effect's own timer, so a
 * keystroke's cleanup cancels the previous request before it is ever sent, and a slow answer
 * for "ha" cannot land on top of the one for "hair".
 *
 * `fetcher` must be stable — declare it at module scope.
 */
export const useDebouncedLookup = <TRequest, TResult>(
  request: TRequest | null,
  fetcher: (request: TRequest) => Promise<TResult>,
  { delayMs, errorContext }: Options
): DebouncedLookup<TResult> => {
  const [answer, setAnswer] = useState<Answer<TRequest, TResult> | null>(null)

  useEffect(() => {
    if (request === null) return
    let cancelled = false

    const timer = setTimeout(() => {
      void fetcher(request)
        .then((result) => {
          if (!cancelled) setAnswer({ request, result, failed: false })
        })
        .catch((error: unknown) => {
          reportError(error, errorContext)
          if (!cancelled) setAnswer({ request, result: undefined, failed: true })
        })
    }, delayMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [delayMs, errorContext, fetcher, request])

  if (request === null) return { result: undefined, isIdle: true, isLoading: false, failed: false }

  const isAnswered = answer?.request === request

  return {
    // The previous answer stays up while the next is in flight, so refining "hai" to
    // "hair" narrows the list rather than blinking it out for a spinner.
    result: answer?.result,
    isIdle: false,
    isLoading: !isAnswered,
    failed: isAnswered && answer.failed,
  }
}
