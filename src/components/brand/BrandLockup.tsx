import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'
import { BookieMark } from './BookieMark'

export type BrandLockupTone = 'brand' | 'inverse'

export type BrandLockupProps = {
  href?: string
  size?: 'sm' | 'md'
  /** `inverse` reads on a navy ground — the consumer registration hero panel. */
  tone?: BrandLockupTone
  className?: string
}

const MARK = {
  sm: { box: 'size-8', mark: 18 },
  md: { box: 'size-10', mark: 22 },
} as const

const TILE: Record<BrandLockupTone, string> = {
  brand: 'bg-brand text-surface',
  inverse: 'bg-surface text-brand',
}

const WORDMARK: Record<BrandLockupTone, string> = {
  brand: 'text-brand',
  inverse: 'text-surface',
}

/**
 * Mark-in-tile + wordmark, matching the prototype header and footer.
 * One component so the two sites cannot drift.
 */
export const BrandLockup: FC<BrandLockupProps> = ({ href = ROUTES.home, size = 'md', tone = 'brand', className }) => {
  const t = useTranslations('Nav')
  const mark = MARK[size]

  return (
    <AppLink
      href={href}
      variant='plain'
      className={cn('flex items-center gap-3', className)}
      aria-label={t('homeLink')}
    >
      <span className={cn('rounded-brand-sm flex shrink-0 items-center justify-center', TILE[tone], mark.box)}>
        <BookieMark size={mark.mark} color='currentColor' />
      </span>
      <AppText
        className={cn('font-extrabold tracking-tight', WORDMARK[tone], size === 'md' ? 'text-xl' : 'text-lg')}
      >
        Bookie
      </AppText>
    </AppLink>
  )
}
