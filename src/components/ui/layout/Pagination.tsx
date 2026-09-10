import { FC, ReactNode } from 'react'
import { cn } from '@helpers/cn'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'

export type PaginationProps = {
  /** 1-based, already clamped into range by whoever fetched the page. */
  page: number
  pageCount: number
  /** Locale-free href for a page — `AppLink` adds the prefix. */
  buildHref: (page: number) => string
  /** Accessible name, since a page may carry more than one pager. */
  label: string
  previousLabel?: string
  nextLabel?: string
  pageLabel?: (page: number) => string
  className?: string
}

/**
 * How many numbered links surround the current page. 2 keeps the control inside a 320px
 * viewport at the widest case (prev · 1 · … · 4 · 5 · 6 · … · 12 · next).
 */
const SIBLINGS = 2

const CELL = 'inline-flex size-10 shrink-0 items-center justify-center rounded-brand-sm text-body-sm font-bold no-underline'

/**
 * Real anchors, and therefore a Server Component.
 *
 * Every page is a distinct URL that a crawler can follow, the browser can prefetch and
 * the visitor can bookmark — none of which a `useState` pager gives you, and all of which
 * matter on a public directory. It is also why this is antd-free: an antd `Pagination`
 * would pull the client runtime into a route whose whole point is server-rendered HTML.
 *
 * The window is elided rather than scrolled: with 12 pages, rendering all 12 is fine, but
 * the same component has to survive 200, so `…` stands in for the runs this page cannot
 * reach in one hop.
 */
const buildWindow = (page: number, pageCount: number): (number | 'gap')[] => {
  const pages: (number | 'gap')[] = []
  let previous = 0

  for (let candidate = 1; candidate <= pageCount; candidate += 1) {
    const isEdge = candidate === 1 || candidate === pageCount
    const isNearCurrent = Math.abs(candidate - page) <= SIBLINGS
    if (!isEdge && !isNearCurrent) continue

    if (previous && candidate - previous > 1) pages.push('gap')
    pages.push(candidate)
    previous = candidate
  }

  return pages
}

const Step: FC<{ href?: string; label: string; children: ReactNode }> = ({ href, label, children }) =>
  href ? (
    <AppLink
      href={href}
      variant='unstyled'
      aria-label={label}
      className={cn(CELL, 'border-brand-border text-brand-text hover:bg-surface hover:border-brand border')}
    >
      {children}
    </AppLink>
  ) : (
    // A disabled step must stay in the flow so the numbers do not shift on page 1,
    // but it must not be focusable — an <a> without href is neither a link nor a button.
    <span aria-hidden='true' className={cn(CELL, 'border-brand-border text-brand-muted border opacity-40')}>
      {children}
    </span>
  )

export const Pagination: FC<PaginationProps> = ({
  page,
  pageCount,
  buildHref,
  label,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  pageLabel = (entry) => `Page ${entry}`,
  className,
}) => {
  if (pageCount <= 1) return null

  return (
    <nav aria-label={label} className={cn('flex items-center justify-center gap-2 sm:gap-4', className)}>
      <Step href={page > 1 ? buildHref(page - 1) : undefined} label={previousLabel}>
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth={2}
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
          className='size-4'
        >
          <path d='m14.5 5.5-6.5 6.5 6.5 6.5' />
        </svg>
      </Step>

      <ul className='m-0 flex list-none items-center gap-1 p-0 sm:gap-2'>
        {buildWindow(page, pageCount).map((entry, index) =>
          entry === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden='true'>
              <AppText size='body-sm' tone='muted' className='px-1'>
                …
              </AppText>
            </li>
          ) : (
            <li key={entry}>
              {entry === page ? (
                <AppText
                  aria-current='page'
                  numeric
                  className={cn(CELL, 'bg-brand text-white')}
                >
                  {entry}
                </AppText>
              ) : (
                <AppLink
                  href={buildHref(entry)}
                  variant='unstyled'
                  aria-label={pageLabel(entry)}
                  className={cn(CELL, 'text-brand-text hover:bg-brand-50 tnum')}
                >
                  {entry}
                </AppLink>
              )}
            </li>
          )
        )}
      </ul>

      <Step href={page < pageCount ? buildHref(page + 1) : undefined} label={nextLabel}>
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth={2}
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
          className='size-4'
        >
          <path d='m9.5 5.5 6.5 6.5-6.5 6.5' />
        </svg>
      </Step>
    </nav>
  )
}
