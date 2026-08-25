import { FC, PropsWithChildren, ReactNode } from 'react'
import { cn } from '@helpers/cn'
import AppParagraph from '@components/ui/bare/AppParagraph'
import AppText from '@components/ui/bare/AppText'
import AppTitle, { AppTitleLevel, AppTitleSize } from '@components/ui/bare/AppTitle'

export type SectionProps = PropsWithChildren<{
  title?: ReactNode
  /** Small count or qualifier shown next to the title, e.g. "4". */
  count?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  headingLevel?: 2 | 3 | 4
  className?: string
}>

const LEVELS: Record<2 | 3 | 4, AppTitleLevel> = { 2: 'h2', 3: 'h3', 4: 'h4' }
const SIZES: Record<2 | 3 | 4, AppTitleSize> = { 2: 'h2', 3: 'h3', 4: 'body' }

const Section: FC<SectionProps> = ({ title, count, description, actions, headingLevel = 2, className, children }) => (
  <section className={cn('flex flex-col gap-4', className)}>
    {(title || description || actions) && (
      <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4'>
        <div className='flex flex-col gap-1'>
          {title && (
            <AppTitle level={LEVELS[headingLevel]} size={SIZES[headingLevel]}>
              {title}
              {count !== undefined && count !== null && (
                <AppText size='body-sm' tone='muted' numeric className='ml-2 font-normal'>
                  {count}
                </AppText>
              )}
            </AppTitle>
          )}
          {description && <AppParagraph size='body-sm'>{description}</AppParagraph>}
        </div>
        {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
      </div>
    )}
    {children}
  </section>
)

export default Section
