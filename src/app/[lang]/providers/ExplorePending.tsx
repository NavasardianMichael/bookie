'use client'

import { createContext, FC, ReactNode, TransitionStartFunction, useContext, useTransition } from 'react'
import { Spin } from 'antd'
import { cn } from '@helpers/cn'

type ExplorePendingValue = {
  isPending: boolean
  startTransition: TransitionStartFunction
}

const ExplorePendingContext = createContext<ExplorePendingValue | null>(null)

/**
 * One transition for every Explore URL patch, so the search box, sort/filter, and the
 * results overlay share the same pending bit. A second `useTransition` in the field
 * would spin the input while the grid still had no idea a request was in flight.
 */
export const ExplorePendingProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isPending, startTransition] = useTransition()

  return (
    <ExplorePendingContext.Provider value={{ isPending, startTransition }}>{children}</ExplorePendingContext.Provider>
  )
}

export const useExplorePending = (): ExplorePendingValue => {
  const value = useContext(ExplorePendingContext)
  if (!value) {
    throw new Error('useExplorePending must be used within ExplorePendingProvider')
  }
  return value
}

/**
 * Keeps the current result set on screen while the next one streams in. The overlay is
 * what makes a live search feel like filtering; swapping the grid for a skeleton was
 * the alternative, and it threw the previous cards away on every keystroke.
 */
export const ProvidersResultsOverlay: FC<{ children: ReactNode }> = ({ children }) => {
  const { isPending } = useExplorePending()

  return (
    <div className='relative' aria-busy={isPending}>
      {children}
      {isPending ? (
        <div className={cn('absolute inset-0 z-1 rounded-brand bg-surface/70')}>
          <div className='sticky top-1/2 flex -translate-y-1/2 justify-center'>
            <Spin />
          </div>
        </div>
      ) : null}
    </div>
  )
}
