import { FC, ReactNode } from 'react'
import Image from 'next/image'
import { Link } from '@i18n/navigation'
import { cn } from '@helpers/cn'
import { getInitials, isUploadedAsset, resolveAssetUrl } from '@helpers/images'
import { AppLink } from './bare/AppLink'
import { AppParagraph } from './bare/AppParagraph'
import { AppTitle, AppTitleLevel } from './bare/AppTitle'

export type EntityCardProps = {
  href?: string
  title: string
  subtitle?: ReactNode
  description?: ReactNode
  image?: string
  /** Fallback initials source when there is no image. Defaults to `title`. */
  fallbackName?: string
  /**
   * Painted centred on the brand-tinted ground when there is no real photo.
   * Defaults to the initials. Pass a glyph that suits the entity — a person for a
   * provider, a building for an organization — since one card serves them all.
   */
  placeholder?: ReactNode
  /**
   * Must sit one step below the heading of the section holding the card, or the
   * document outline skips a level.
   */
  headingLevel?: 2 | 3 | 4
  /**
   * Media well. `false` drops it entirely — categories have no photo, so a tinted
   * initials box would be a blank image slot, not a fallback.
   */
  aspect?: '1/1' | '4/3' | '16/9' | false
  badges?: ReactNode
  footer?: ReactNode
  /**
   * Label for a real "View profile"-style control. When set, this is the only
   * clickable surface — the card itself is not a link.
   */
  cta?: string
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
 * equal heights (`h-full` + a flexed body), a fixed image aspect box (when the
 * card has media) so heights stop tracking source image dimensions, and
 * line-clamped text so one long name cannot break row alignment.
 *
 * A `cta` is the only link (provider cards). Without one, a stretched overlay
 * covers the card so category and organization cards stay one hit target.
 * Wrapping the article in an <a> is how the old CategoryCard nested buttons
 * inside an anchor.
 */
export const EntityCard: FC<EntityCardProps> = ({
  href,
  title,
  subtitle,
  description,
  image,
  fallbackName,
  placeholder,
  headingLevel = 3,
  aspect = '4/3',
  badges,
  footer,
  cta,
  actions,
  className,
}) => {
  // Only a real upload is a photo. `/logo.svg` is the seeded stand-in, and painting
  // it `object-cover` in the aspect box put a stretched Bookie mark on every card.
  const resolved = isUploadedAsset(image) ? resolveAssetUrl(image) : undefined
  const stretchHref = href && !cta ? href : undefined

  return (
    <article
      className={cn(
        'border-brand-border bg-surface relative flex h-full flex-col overflow-hidden rounded-brand border shadow-sm',
        stretchHref &&
          'group transition-all hover:border-brand/50 hover:shadow-md focus-within:border-brand/50 focus-within:shadow-md active:scale-[0.99]',
        className
      )}
    >
      {aspect !== false && (
        <div className={cn('bg-surface-sunken relative overflow-hidden', ASPECTS[aspect])}>
          {resolved ? (
            <Image
              src={resolved}
              alt={title}
              fill
              sizes='(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 296px'
              className={cn('object-cover', stretchHref && 'transition-transform duration-500 group-hover:scale-105')}
            />
          ) : (
            <span className='bg-brand-50 absolute inset-0 flex items-center justify-center'>
              {placeholder ?? (
                <span aria-hidden='true' className='text-brand-400 text-2xl font-semibold'>
                  {getInitials(fallbackName ?? title)}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      <div className='flex flex-1 flex-col gap-2 p-5 sm:p-6'>
        <div className='flex flex-col gap-0.5'>
          <AppTitle
            level={LEVELS[headingLevel]}
            size='h3'
            className={cn('line-clamp-1', stretchHref && 'transition-colors group-hover:text-brand')}
          >
            {title}
          </AppTitle>
          {subtitle && (
            <AppParagraph size='caption' className='line-clamp-1 font-medium'>
              {subtitle}
            </AppParagraph>
          )}
        </div>

        {description && (
          <AppParagraph size='body-sm' className='line-clamp-2'>
            {description}
          </AppParagraph>
        )}

        {badges && <div className='relative z-2 mt-auto flex flex-wrap items-center gap-1 pt-2'>{badges}</div>}

        {footer && <div className='text-caption mt-auto pt-1'>{footer}</div>}

        {cta && href && (
          <AppLink href={href} variant='button' tone='primary' block>
            {cta}
          </AppLink>
        )}

        {actions && <div className='relative z-2 mt-auto flex items-center justify-end gap-1 pt-1'>{actions}</div>}
      </div>

      {stretchHref && (
        <Link href={stretchHref} aria-label={title} className='absolute inset-0 z-1'>
          <span className='sr-only'>{title}</span>
        </Link>
      )}
    </article>
  )
}
