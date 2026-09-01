import { FC, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'

export type ChipRailProps = PropsWithChildren<{
  className?: string
  /** Accessible name for the scrollable list. */
  label?: string
}>

/**
 * Horizontal chip scroller for category filters. Overflow is the point: a wrap
 * would push the grid down on a phone, and a breakpoint table would hide chips
 * the user still needs. Touch-pan is native; the thin scrollbar is webkit-only
 * decoration.
 */
const ChipRail: FC<ChipRailProps> = ({ className, label, children }) => (
  <ul
    aria-label={label}
    className={cn(
      'm-0 flex list-none gap-3 overflow-x-auto p-0 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:h-1',
      className
    )}
  >
    {children}
  </ul>
)

export default ChipRail
