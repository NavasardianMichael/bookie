import { FC, HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@helpers/cn'

export type AppTitleLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
export type AppTitleSize = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'body-sm'

type Props = HTMLAttributes<HTMLHeadingElement> & {
  level?: AppTitleLevel
  /** Visual step, independent of `level`. Defaults to the step matching the level. */
  size?: AppTitleSize
}

const SIZES: Record<AppTitleSize, string> = {
  display: 'text-display',
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
  body: 'text-body font-semibold',
  'body-sm': 'text-body-sm font-semibold',
}

/** The scale stops at h3; deeper levels fall back to emphasised body copy. */
const SIZE_BY_LEVEL: Record<AppTitleLevel, AppTitleSize> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'body',
  h5: 'body',
  h6: 'body-sm',
}

/**
 * Level and size are separate props on purpose: the document outline is a
 * structural decision — and the one crawlers read — while type size is a visual
 * one, and the two disagree often enough that every call site was hand-passing a
 * `text-h*` class next to `level`.
 *
 * A bare heading tag, no antd: renders in any Server Component.
 */
export const AppTitle: FC<PropsWithChildren<Props>> = ({ level = 'h1', size, children, className, ...props }) => {
  const TitleTag = level

  return (
    <TitleTag className={cn('text-brand-text', SIZES[size ?? SIZE_BY_LEVEL[level]], className)} {...props}>
      {children}
    </TitleTag>
  )
}
