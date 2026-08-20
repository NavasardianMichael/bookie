import { FC, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'

export type StackProps = PropsWithChildren<{
  /** `responsive` stacks below md and becomes a row from md up. */
  direction?: 'col' | 'row' | 'responsive'
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between'
  wrap?: boolean
  as?: 'div' | 'ul' | 'nav' | 'section'
  className?: string
}>

const DIRECTIONS = {
  col: 'flex-col',
  row: 'flex-row',
  responsive: 'flex-col md:flex-row',
} as const

const GAPS = { xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6' } as const

const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
} as const

const JUSTIFY = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const

const Stack: FC<StackProps> = ({
  direction = 'col',
  gap = 'md',
  align,
  justify,
  wrap,
  as: Tag = 'div',
  className,
  children,
}) => (
  <Tag
    className={cn(
      'flex',
      DIRECTIONS[direction],
      GAPS[gap],
      align && ALIGN[align],
      justify && JUSTIFY[justify],
      wrap && 'flex-wrap',
      className
    )}
  >
    {children}
  </Tag>
)

export default Stack
