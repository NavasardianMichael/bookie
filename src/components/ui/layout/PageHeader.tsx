import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'

export type PageHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  /** Chips, tags or a category row, below the title. */
  meta?: ReactNode
  actions?: ReactNode
  /** Avatar or hero image. Reads above the title on mobile, beside it from md. */
  media?: ReactNode
  className?: string
}

/**
 * One markup order, two layouts: `media` is placed last in the DOM and pulled
 * back visually with `md:order-last`, so mobile stacks image-over-text while
 * desktop puts the image to the right — no duplicated markup, no wasted column
 * on a narrow screen.
 */
const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, meta, actions, media, className }) => (
  <header className={cn('flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6', className)}>
    {media && <div className='shrink-0 md:order-last'>{media}</div>}

    <div className='flex min-w-0 flex-col gap-3'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-h1 text-brand-text'>{title}</h1>
        {subtitle && <p className='text-body-sm'>{subtitle}</p>}
      </div>
      {meta && <div className='flex flex-wrap items-center gap-2'>{meta}</div>}
      {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
    </div>
  </header>
)

export default PageHeader
