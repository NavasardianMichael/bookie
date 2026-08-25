import { FC, ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@helpers/cn'
import { getInitials, resolveAssetUrl } from '@helpers/images'
import AppParagraph from './bare/AppParagraph'
import AppTitle, { AppTitleLevel } from './bare/AppTitle'

export type EntityCardProps = {
  href?: string
  title: string
  subtitle?: ReactNode
  description?: ReactNode
  image?: string
  /** Fallback initials source when there is no image. Defaults to `title`. */
  fallbackName?: string
  /**
   * Must sit one step below the heading of the section holding the card, or the
   * document outline skips a level.
   */
  headingLevel?: 2 | 3 | 4
  aspect?: '1/1' | '4/3' | '16/9'
  badges?: ReactNode
  footer?: ReactNode
  /** Rendered above the badges; keep interactive content out of here. */
  actions?: ReactNode
  className?: string
}

const ASPECTS = {
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-video',
} as const

const LEVELS: Record<2 | 3 | 4, AppTitleLevel> = { 2: 'h2', 3: 'h3', 4: 'h4' }

/**
 * One card for providers, organizations, categories and services.
 *
 * Three things the grid requires and the previous per-domain cards did not do:
 * equal heights (`h-full` + a flexed body), a fixed image aspect box so card
 * heights stop tracking source image dimensions, and line-clamped text so one
 * long name cannot break row alignment.
 *
 * Clicking uses a stretched link rather than wrapping content in an anchor: the
 * old CategoryCard nested buttons inside an <a>, which is invalid HTML and breaks
 * keyboard navigation, and ProviderCard's anchor excluded the cover image.
 */
const EntityCard: FC<EntityCardProps> = ({
  href,
  title,
  subtitle,
  description,
  image,
  fallbackName,
  headingLevel = 3,
  aspect = '4/3',
  badges,
  footer,
  actions,
  className,
}) => {
  const resolved = resolveAssetUrl(image)

  return (
    <article
      className={cn(
        'group border-brand-border bg-surface relative flex h-full flex-col overflow-hidden rounded-brand border transition-shadow',
        href && 'hover:shadow-md focus-within:shadow-md active:scale-[0.99] active:shadow-sm',
        className
      )}
    >
      <div className={cn('bg-surface-sunken relative overflow-hidden', ASPECTS[aspect])}>
        {resolved ? (
          <Image
            src={resolved}
            alt={title}
            fill
            sizes='(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 296px'
            className='object-cover transition-transform duration-300 group-hover:scale-[1.02]'
          />
        ) : (
          <span className='bg-brand-100 text-brand-700 absolute inset-0 flex items-center justify-center text-2xl font-semibold'>
            <span aria-hidden='true'>{getInitials(fallbackName ?? title)}</span>
          </span>
        )}
      </div>

      <div className='flex flex-1 flex-col gap-2 p-3 sm:p-4'>
        <div className='flex flex-col gap-0.5'>
          <AppTitle level={LEVELS[headingLevel]} size='h3' className='line-clamp-1'>
            {title}
          </AppTitle>
          {subtitle && (
            <AppParagraph size='caption' className='line-clamp-1'>
              {subtitle}
            </AppParagraph>
          )}
        </div>

        {description && (
          <AppParagraph size='body-sm' className='line-clamp-2'>
            {description}
          </AppParagraph>
        )}

        {badges && <div className='relative z-2 mt-auto flex flex-wrap items-center gap-1 pt-1'>{badges}</div>}

        {footer && <div className='text-caption mt-auto pt-1'>{footer}</div>}

        {actions && <div className='relative z-2 mt-auto flex items-center justify-end gap-1 pt-1'>{actions}</div>}
      </div>

      {href && (
        <Link href={href} aria-label={title} className='absolute inset-0 z-1'>
          <span className='sr-only'>{title}</span>
        </Link>
      )}
    </article>
  )
}

export default EntityCard
