import { FC, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'

export type ContainerWidth = 'auth' | 'form' | 'prose' | 'content' | 'wide' | 'full'

export type ContainerProps = PropsWithChildren<{
  as?: 'div' | 'section' | 'article' | 'header' | 'footer' | 'nav' | 'main'
  width?: ContainerWidth
  /** Horizontal page gutters. Disable when nesting inside another Container. */
  gutter?: boolean
  className?: string
}>

// Literal class strings in a lookup, never template interpolation: Tailwind v4
// scans source text and will not generate a dynamically assembled class.
const WIDTHS: Record<ContainerWidth, string> = {
  auth: 'max-w-auth-content',
  form: 'max-w-form-content',
  prose: 'max-w-prose-content',
  content: 'max-w-content',
  wide: 'max-w-[96rem]',
  full: 'max-w-none',
}

/**
 * Centred, width-capped page column with fluid, safe-area-aware gutters.
 *
 * Without this the app runs edge-to-edge behind a flat `p-4`, which is what made
 * a text input 1800px wide on a desktop monitor.
 */
const Container: FC<ContainerProps> = ({
  as: Tag = 'div',
  width = 'content',
  gutter = true,
  className,
  children,
}) => (
  <Tag className={cn('mx-auto w-full', WIDTHS[width], gutter && 'app-gutter-x', className)}>{children}</Tag>
)

export default Container
