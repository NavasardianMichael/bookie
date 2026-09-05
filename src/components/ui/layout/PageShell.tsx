import { FC, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'
import { Container, ContainerWidth } from './Container'

export type PageShellProps = PropsWithChildren<{
  /**
   * `flow` (default) takes natural document height.
   *
   * `fill` reserves the viewport minus the header, for screens that push a CTA to
   * the bottom with `justify-between`. Needed because the shell is a document
   * scroller rather than a fixed-height flex column, so `h-full` would resolve
   * to `auto`.
   */
  variant?: 'flow' | 'fill'
  width?: ContainerWidth
  as?: 'div' | 'section' | 'article' | 'main'
  /**
   * Horizontal gutters and vertical padding, both on by default. Disable for a full-bleed
   * screen that paints to the viewport edge — the consumer registration split panel.
   */
  padded?: boolean
  className?: string
}>

export const PageShell: FC<PageShellProps> = ({
  variant = 'flow',
  width = 'content',
  as,
  padded = true,
  className,
  children,
}) => (
  <Container
    as={as}
    width={width}
    gutter={padded}
    className={cn(
      padded && 'py-8 sm:py-10 lg:py-12',
      variant === 'fill' && 'flex min-h-[calc(100dvh-var(--spacing-header))] flex-col',
      className
    )}
  >
    {children}
  </Container>
)
