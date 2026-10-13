import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'

export type AppDescriptionListItem = {
  key: string
  label: ReactNode
  value: ReactNode
}

export type AppDescriptionListProps = {
  items: AppDescriptionListItem[]
  columns?: 1 | 2
  /** `caption` is the step under `body-sm`, for a list whose values must stay on one line. */
  size?: 'body-sm' | 'caption'
  className?: string
}

const COLUMNS: Record<1 | 2, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
}

const SIZE = {
  'body-sm': 'text-body-sm',
  caption: 'text-caption',
} as const

/**
 * A real `<dl>` in place of antd's Descriptions.
 *
 * Two reasons. Descriptions is `"use client"`, so the phone, address and email it
 * held only reached the HTML after hydration; and its table markup expresses no
 * relationship between a label and its value, where `<dt>`/`<dd>` pairs state it
 * outright — which is what both crawlers and LLM readers extract.
 *
 * `gap-px` over a border-coloured background draws the hairline grid, so the rule
 * between rows never doubles up at the wrap points.
 *
 * `grow` on the `<dd>` is what lets a value lay itself out against the row's far
 * edge — `CopyableLinkValue` puts its copy button there. Plain text values are
 * start-aligned either way, so it changes nothing for them.
 */
export const AppDescriptionList: FC<AppDescriptionListProps> = ({
  items,
  columns = 2,
  size = 'body-sm',
  className,
}) => {
  if (!items.length) return null

  return (
    <dl
      className={cn(
        'border-brand-border bg-brand-border grid gap-px overflow-hidden rounded-brand border',
        COLUMNS[columns],
        className
      )}
    >
      {items.map(({ key, label, value }) => (
        <div key={key} className='bg-surface flex flex-col gap-0.5 p-3 sm:flex-row sm:gap-4'>
          <dt
            className={cn(
              SIZE[size],
              'text-brand-muted shrink-0',
              // A fixed label column lines the rows up. The caption size uses a narrower
              // one: wide enough for the longest weekday, narrow enough that a 12-hour
              // range stays on one line in the profile sidebar.
              size === 'body-sm' ? 'sm:w-34' : 'whitespace-nowrap sm:w-24'
            )}
          >
            {label}
          </dt>
          <dd className={cn(SIZE[size], 'text-brand-text min-w-0 grow wrap-break-word')}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
