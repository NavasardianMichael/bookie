'use client'

import { FC, useState } from 'react'
import { FilterOutlined, SortAscendingOutlined } from '@ant-design/icons'
import { Badge, Dropdown, MenuProps, Switch } from 'antd'
import { useTranslations } from 'next-intl'
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

type FilterKey = 'available' | 'openToday'

/**
 * Every toggle in the sheet, so adding one is a row here rather than four edits.
 *
 * A filter has to be a single-column or single-JSON-path predicate to earn a place:
 * rating, price and distance were left out on purpose — `Review` has no aggregate
 * column, `Service.price` mixes currencies with no conversion, and `Provider.address`
 * is free text with no geocoding. Each would be a per-row computation or a wrong
 * answer. See `docs/BACKLOG.md`. Unlisted pages are excluded by the API, not by a toggle.
 *
 * `available` is the pause-bookings flag. `openToday` is whether today's weekday in
 * `weekSchedule` has hours — a provider can be open today and still have paused
 * bookings, or the reverse.
 */
const FILTERS: { key: FilterKey; labelKey: 'availableNow' | 'activeToday'; hintKey: 'availableNowHint' | 'activeTodayHint' }[] = [
  { key: 'available', labelKey: 'availableNow', hintKey: 'availableNowHint' },
  { key: 'openToday', labelKey: 'activeToday', hintKey: 'activeTodayHint' },
]

const SORT_KEYS: ProvidersListSort[] = ['recommended', 'nameAsc', 'nameDesc', 'newest']

/**
 * Sort and Filter, as the two icon buttons beside the Service providers heading.
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
  const t = useTranslations('Explore')
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState({ available: params.available, openToday: params.openToday })

  // No `useTransition` here, unlike the search field: nothing on these two controls
  // renders a pending state, because the grid's `<Suspense>` skeleton already is one.
  const go = (patch: Partial<ExploreParams>) => {
    router.replace(buildExploreHref(params, patch), { scroll: false })
  }

  const openSheet = () => {
    // Re-seed from the URL: the visitor may have paged or changed category since the
    // last time the sheet was open, and a stale draft would silently undo that.
    setDraft({ available: params.available, openToday: params.openToday })
    setIsOpen(true)
  }

  const apply = () => {
    setIsOpen(false)
    go(draft)
  }

  const reset = () => {
    setDraft({ available: false, openToday: false })
  }

  const activeCount = countActiveFilters(params)

  const sortMenu: MenuProps = {
    selectable: true,
    selectedKeys: [params.sort],
    items: SORT_KEYS.map((sort) => ({
      key: sort,
      label: t(`sort.${sort}`),
    })),
    onClick: ({ key }) => go({ sort: key as ProvidersListSort }),
  }

  return (
    <>
      <Dropdown menu={sortMenu} trigger={['click']} placement='bottomRight'>
        <AppButton icon={<SortAscendingOutlined />} aria-label={t('sortAria', { sort: t(`sort.${params.sort}`) })}>
          <AppText size='body-sm' className='hidden font-medium sm:inline'>
            {t(`sort.${params.sort}`)}
          </AppText>
        </AppButton>
      </Dropdown>

      <Badge count={activeCount} size='small' offset={[-2, 2]}>
        <AppButton icon={<FilterOutlined />} onClick={openSheet} aria-label={t('filterAria')} />
      </Badge>

      <AppSheet open={isOpen} onClose={() => setIsOpen(false)} title={t('filtersTitle')}>
        <div className='flex flex-col gap-6'>
          <ul className='m-0 flex list-none flex-col gap-4 p-0'>
            {FILTERS.map(({ key, labelKey, hintKey }) => (
              <li key={key} className='flex items-start justify-between gap-4'>
                {/* A div, not a span: AppParagraph is a <p>, which cannot sit in phrasing
                    content. The <label> makes the name and the hint a hit target for the
                    switch — a filter row whose only 44px target is the toggle itself is a
                    thumb-sized miss on a phone. */}
                <div className='flex flex-col gap-0.5'>
                  <label htmlFor={`filter-${key}`} className='w-fit cursor-pointer font-semibold'>
                    <AppText size='body-sm'>{t(labelKey)}</AppText>
                  </label>
                  <AppParagraph size='caption'>{t(hintKey)}</AppParagraph>
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
            <AppButton onClick={reset} disabled={!draft.available && !draft.openToday}>
              {t('reset')}
            </AppButton>
            <AppButton type='primary' onClick={apply}>
              {t('showResults')}
            </AppButton>
          </div>
        </div>
      </AppSheet>
    </>
  )
}
