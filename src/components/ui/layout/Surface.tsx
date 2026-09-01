import { FC, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'

export type SurfaceProps = PropsWithChildren<{
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'li'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
}>

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
} as const

/**
 * White panel on the sunken canvas. The prototype's every card, form and
 * sidebar block is this: surface fill, hairline border, `rounded-xl`, light
 * shadow. Pages compose it; they do not re-declare those four classes.
 */
const Surface: FC<SurfaceProps> = ({ as: Tag = 'div', padding = 'md', className, children }) => (
  <Tag className={cn('bg-surface border-brand-border rounded-brand border shadow-sm', PADDING[padding], className)}>
    {children}
  </Tag>
)

export default Surface
