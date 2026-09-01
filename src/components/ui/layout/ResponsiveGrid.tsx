import { FC, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'

export type ResponsiveGridProps = PropsWithChildren<{
  /** Minimum comfortable card width. Column count follows from the container. */
  min?: 'sm' | 'md' | 'lg'
  gap?: 'sm' | 'md' | 'lg'
  as?: 'div' | 'ul'
  className?: string
}>

/**
 * `auto-fill` + `minmax` is self-tuning: it stays correct inside a narrower
 * container (a modal, or the left column of a detail page) with no extra
 * breakpoints, and inside `max-w-content` it caps out at a sensible column count
 * on its own — the container is what limits it.
 *
 * The inner `min(…, 100%)` is load-bearing: a bare `minmax(16rem, 1fr)` overflows
 * any container narrower than 16rem, and 320px minus gutters is 288px.
 */
const MIN_COLS = {
  sm: 'grid-cols-[repeat(auto-fill,minmax(min(12rem,100%),1fr))]',
  md: 'grid-cols-[repeat(auto-fill,minmax(min(17rem,100%),1fr))]',
  lg: 'grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))]',
} as const

const GAPS = {
  sm: 'gap-3',
  md: 'gap-4 sm:gap-5',
  lg: 'gap-6 md:gap-8',
} as const

export const ResponsiveGrid: FC<ResponsiveGridProps> = ({
  min = 'md',
  gap = 'md',
  as: Tag = 'div',
  className,
  children,
}) => <Tag className={cn('grid', MIN_COLS[min], GAPS[gap], className)}>{children}</Tag>
