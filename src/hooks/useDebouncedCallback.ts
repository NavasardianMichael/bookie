'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Defers a callback until the caller has been quiet for `delay` ms, and cancels any pending
 * run on unmount so a resolved timer cannot set state on a gone component.
 *
 * The latest callback is held in a ref, so the returned function is stable and safe to pass
 * straight to a prop without re-subscribing every render.
 */
export const useDebouncedCallback = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number
): ((...args: TArgs) => void) => {
  const callbackRef = useRef(callback)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay)
    },
    [delay]
  )
}
