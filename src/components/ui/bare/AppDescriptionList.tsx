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
  className?: string
}

const COLUMNS: Record<1 | 2, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
}

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
 */
export const AppDescriptionList: FC<AppDescriptionListProps> = ({ items, columns = 2, className }) => {
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
          <dt className='text-body-sm text-brand-muted shrink-0 sm:w-28'>{label}</dt>
          <dd className='text-body-sm text-brand-text min-w-0 wrap-break-word'>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
