import { FC } from 'react'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import AppLink from '@components/ui/bare/AppLink'
import AppText from '@components/ui/bare/AppText'
import { BookieMark } from './BookieMark'

export type BrandLockupProps = {
  href?: string
  size?: 'sm' | 'md'
  className?: string
}

const MARK = {
  sm: { box: 'size-8', mark: 18 },
  md: { box: 'size-10', mark: 22 },
} as const

/**
 * Mark-in-navy-tile + wordmark, matching the prototype header and footer.
 * One component so the two sites cannot drift.
 */
export const BrandLockup: FC<BrandLockupProps> = ({ href = ROUTES.home, size = 'md', className }) => {
  const mark = MARK[size]

  return (
    <AppLink
      href={href}
      variant='plain'
      className={cn('flex items-center gap-3', className)}
      aria-label='Bookie home'
    >
      <span
        className={cn(
          'bg-brand text-surface flex shrink-0 items-center justify-center rounded-brand-sm',
          mark.box
        )}
      >
        <BookieMark size={mark.mark} color='currentColor' />
      </span>
      <AppText tone='brand' className={cn('font-extrabold tracking-tight', size === 'md' ? 'text-xl' : 'text-lg')}>
        Bookie
      </AppText>
    </AppLink>
  )
}
