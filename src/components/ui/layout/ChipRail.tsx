import { FC, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'

export type ChipRailProps = PropsWithChildren<{
  className?: string
  /** Accessible name for the chip list. */
  label?: string
}>

/**
 * Wrapping chip row for category filters. Chips stay full size (`shrink-0` at
 * the call site) and wrap onto the next line when the row is too narrow, so
 * nothing is hidden behind a horizontal scroll.
 */
export const ChipRail: FC<ChipRailProps> = ({ className, label, children }) => (
  <ul aria-label={label} className={cn('m-0 flex list-none flex-wrap gap-3 p-0', className)}>
    {children}
  </ul>
)
