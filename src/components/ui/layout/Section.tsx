import { FC, PropsWithChildren, ReactNode } from 'react'
import { cn } from '@helpers/cn'

export type SectionProps = PropsWithChildren<{
  title?: ReactNode
  /** Small count or qualifier shown next to the title, e.g. "4". */
  count?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  headingLevel?: 2 | 3 | 4
  className?: string
}>

const HEADINGS = {
  2: 'text-h2',
  3: 'text-h3',
  4: 'text-body font-semibold',
} as const

const Section: FC<SectionProps> = ({
  title,
  count,
  description,
  actions,
  headingLevel = 2,
  className,
  children,
}) => {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'

  return (
    <section className={cn('flex flex-col gap-4', className)}>
      {(title || description || actions) && (
        <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4'>
          <div className='flex flex-col gap-1'>
            {title && (
              <Heading className={cn('text-brand-text', HEADINGS[headingLevel])}>
                {title}
                {count !== undefined && count !== null && (
                  <span className='text-brand-muted ml-2 text-body-sm font-normal tnum'>{count}</span>
                )}
              </Heading>
            )}
            {description && <p className='text-body-sm'>{description}</p>}
          </div>
          {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export default Section
