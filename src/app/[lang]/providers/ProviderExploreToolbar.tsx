'use client'

import { FC, useState } from 'react'
import { FilterOutlined, SortAscendingOutlined } from '@ant-design/icons'
import { Badge, Dropdown, MenuProps, Switch } from 'antd'
import { ProvidersListSort } from '@api/providers/types'
import { useRouter } from '@i18n/navigation'
import { AppButton } from '@components/ui/AppButton'
import { AppSheet } from '@components/ui/AppSheet'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppText } from '@components/ui/bare/AppText'
import { buildExploreHref, countActiveFilters, ExploreParams } from './exploreParams'

type Props = {
  params: ExploreParams
}

const SORT_LABELS: Record<ProvidersListSort, string> = {
  recommended: 'Recommended',
  nameAsc: 'Name A–Z',
  nameDesc: 'Name Z–A',
  newest: 'Newest first',
}

/**
 * Every toggle in the sheet, so adding one is a row here rather than four edits.
 *
 * Both are single-column or single-EXISTS predicates, which is the bar a filter has to
 * clear to earn a place: rating, price and distance were left out on purpose — `Review`
 * has no aggregate column, `Service.price` mixes currencies with no conversion, and
 * `Provider.address` is free text with no geocoding. Each would be a per-row computation
 * or a wrong answer. See `docs/BACKLOG.md`.
 */
const FILTERS: { key: 'available' | 'bookable'; label: string; hint: string }[] = [
  {
    key: 'available',
    label: 'Available now',
    hint: 'Hide providers who have paused new bookings.',
  },
  {
    key: 'bookable',
    label: 'Has bookable services',
    hint: 'Only providers who have published at least one service.',
  },
]

/**
 * Sort and Filter, as the two icon buttons beside the Browse categories heading.
 *
 * Both write to the URL rather than to state — the grid is a Server Component, so the
 * query string is the only channel that reaches it, and it is what makes a filtered
 * result set shareable. `replace` keeps a fiddled filter out of the back button;
 * `scroll: false` leaves the grid where the visitor was looking.
 *
 * The sheet is deliberately staged: toggles collect into `draft` and only Show results
 * navigates, so opening the panel to look does not fire a request, and two changes cost
 * one round-trip instead of two. That is the opposite of the search field, where live
 * feedback is the point.
 */
export const ProviderExploreToolbar: FC<Props> = ({ params }) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState({ available: params.available, bookable: params.bookable })

  // No `useTransition` here, unlike the search field: nothing on these two controls
  // renders a pending state, because the grid's `<Suspense>` skeleton already is one.
  const go = (patch: Partial<ExploreParams>) => {
    router.replace(buildExploreHref(params, patch), { scroll: false })
  }

  const openSheet = () => {
    // Re-seed from the URL: the visitor may have paged or changed category since the
    // last time the sheet was open, and a stale draft would silently undo that.
    setDraft({ available: params.available, bookable: params.bookable })
    setIsOpen(true)
  }

  const apply = () => {
    setIsOpen(false)
    go(draft)
  }

  const reset = () => {
    setDraft({ available: false, bookable: false })
  }

  const activeCount = countActiveFilters(params)

  const sortMenu: MenuProps = {
    selectable: true,
    selectedKeys: [params.sort],
    items: (Object.keys(SORT_LABELS) as ProvidersListSort[]).map((sort) => ({
      key: sort,
      label: SORT_LABELS[sort],
    })),
    onClick: ({ key }) => go({ sort: key as ProvidersListSort }),
  }

  return (
    <>
      <Dropdown menu={sortMenu} trigger={['click']} placement='bottomRight'>
        <AppButton icon={<SortAscendingOutlined />} aria-label={`Sort: ${SORT_LABELS[params.sort]}`}>
          <AppText size='body-sm' className='hidden font-medium sm:inline'>
            {SORT_LABELS[params.sort]}
          </AppText>
        </AppButton>
      </Dropdown>

      <Badge count={activeCount} size='small' offset={[-2, 2]}>
        <AppButton icon={<FilterOutlined />} onClick={openSheet} aria-label='Filter providers' />
      </Badge>

      <AppSheet open={isOpen} onClose={() => setIsOpen(false)} title='Filters'>
        <div className='flex flex-col gap-6'>
          <ul className='m-0 flex list-none flex-col gap-4 p-0'>
            {FILTERS.map(({ key, label, hint }) => (
              <li key={key} className='flex items-start justify-between gap-4'>
                {/* A div, not a span: AppParagraph is a <p>, which cannot sit in phrasing
                    content. The <label> makes the name and the hint a hit target for the
                    switch — a filter row whose only 44px target is the toggle itself is a
                    thumb-sized miss on a phone. */}
                <div className='flex flex-col gap-0.5'>
                  <label htmlFor={`filter-${key}`} className='w-fit cursor-pointer font-semibold'>
                    <AppText size='body-sm'>{label}</AppText>
                  </label>
                  <AppParagraph size='caption'>{hint}</AppParagraph>
                </div>
                <Switch
                  id={`filter-${key}`}
                  checked={draft[key]}
                  onChange={(checked) => setDraft((current) => ({ ...current, [key]: checked }))}
                />
              </li>
            ))}
          </ul>

          <div className='flex justify-end gap-2'>
            <AppButton onClick={reset} disabled={!draft.available && !draft.bookable}>
              Reset
            </AppButton>
            <AppButton type='primary' onClick={apply}>
              Show results
            </AppButton>
          </div>
        </div>
      </AppSheet>
    </>
  )
}
