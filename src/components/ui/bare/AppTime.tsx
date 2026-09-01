import { FC, PropsWithChildren, TimeHTMLAttributes } from 'react'
import { cn } from '@helpers/cn'

type Props = TimeHTMLAttributes<HTMLTimeElement> & {
  /** Machine-readable form: `PT30M` for a duration, `09:00` for a wall-clock time. */
  dateTime: string
}

/**
 * The machine-readable half of a time value. Crawlers and LLM readers take the
 * `datetime` attribute while the page shows the human wording ("30 min",
 * "09:00 – 17:00"), so neither audience has to parse the other's format.
 */
export const AppTime: FC<PropsWithChildren<Props>> = ({ dateTime, children, className, ...props }) => (
  <time dateTime={dateTime} className={cn('tnum', className)} {...props}>
    {children}
  </time>
)
