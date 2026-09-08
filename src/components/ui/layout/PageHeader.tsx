import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'

export type PageHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  /** Chips, tags or a category row, below the title. */
  meta?: ReactNode
  actions?: ReactNode
  /** Avatar or hero image. Reads above the title on mobile, beside it from md. */
  media?: ReactNode
  /**
   * `start` (default) is the app's norm — a list or settings page whose content is
   * left-aligned under it.
   *
   * `center` is for a standalone page that introduces one centred block below it, and it
   * **stays a stacked column at every width**: a centred axis and a title-left /
   * actions-right row are different layouts, so `md:justify-between` is dropped rather
   * than left to fight `items-center`. It is a real prop and not a `className='text-center'`
   * at the call site because `text-align` reaches the title and subtitle by inheritance but
   * would silently leave `meta` and `actions` hugging the left edge.
   */
  align?: 'start' | 'center'
  className?: string
}

/**
 * One markup order, two layouts: `media` is placed last in the DOM and pulled
 * back visually with `md:order-last`, so mobile stacks image-over-text while
 * desktop puts the image to the right — no duplicated markup, no wasted column
 * on a narrow screen.
 */
export const PageHeader: FC<PageHeaderProps> = ({
  title,
  subtitle,
  meta,
  actions,
  media,
  align = 'start',
  className,
}) => {
  const isCentered = align === 'center'
  const rowAlign = isCentered ? 'justify-center' : undefined

  return (
    <header
      className={cn(
        'flex flex-col gap-5',
        isCentered ? 'items-center text-center' : 'md:flex-row md:items-start md:justify-between md:gap-8',
        className
      )}
    >
      {media && <div className={cn('shrink-0', !isCentered && 'md:order-last')}>{media}</div>}

      <div className={cn('flex min-w-0 flex-col gap-4', isCentered && 'items-center')}>
        <div className='flex flex-col gap-2'>
          <AppTitle level='h1'>{title}</AppTitle>
          {subtitle && <AppParagraph>{subtitle}</AppParagraph>}
        </div>
        {meta && <div className={cn('flex flex-wrap items-center gap-2', rowAlign)}>{meta}</div>}
        {actions && <div className={cn('flex flex-wrap items-center gap-2', rowAlign)}>{actions}</div>}
      </div>
    </header>
  )
}
