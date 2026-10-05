'use client'

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { Pagination } from 'antd'
import { useTranslations } from 'next-intl'
import { getAdminProvidersAPI } from '@api/plans/main'
import { useDebouncedCallback } from '@hooks/useDebouncedCallback'
import { AdminProvider } from '@interfaces/plans'
import { PAGINATION_MIN_ITEMS } from '@constants/pagination'
import { classifyError } from '@helpers/error'
import { collapseWhitespace } from '@helpers/search'
import { AppInput } from '@components/ui/AppInput'
import { EmptyState } from '@components/ui/EmptyState'
import { ErrorAlert } from '@components/ui/ErrorAlert'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { AdminProviderPlanRow } from './AdminProviderPlanRow'

const PER_PAGE = 20
const SEARCH_DEBOUNCE_MS = 300

/**
 * Plan assignment — the second admin screen: a paid plan by hand (a trial, a comp, or where
 * Paddle does not sell it). A provider billed through Paddle is tagged, because the next
 * webhook event overwrites a manual change (docs/BILLING.md).
 *
 * Built like `AdminReviewsClient`: a client island, no guard of its own (the API answers
 * 404 to anyone off the allowlist, read here as an empty list), and loading derived from
 * the request's identity rather than set inside the effect.
 */
export const AdminProvidersClient = () => {
  const t = useTranslations('Admin.providers')

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdminProvider[]>([])
  const [total, setTotal] = useState(0)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  const query = useMemo(() => ({ q: search, page, revision }), [page, revision, search])
  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== query

  useEffect(() => {
    let cancelled = false

    void getAdminProvidersAPI({ q: query.q || undefined, page: query.page, perPage: PER_PAGE })
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setTotal(data.total)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setItems([])
        setTotal(0)
        // The 404 is how the API turns away a non-admin, not a failure.
        setLoadError(classifyError(err).kind === 'notFound' ? null : err)
      })
      .finally(() => {
        if (!cancelled) setFulfilled(query)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  const commitSearch = useDebouncedCallback((value: string) => {
    setSearch(collapseWhitespace(value))
    setPage(1)
  }, SEARCH_DEBOUNCE_MS)

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchInput(event.target.value)
      commitSearch(event.target.value)
    },
    [commitSearch]
  )

  // The saved row is the API's answer — it alone knows the effective plan after the write.
  const handleSaved = useCallback((saved: AdminProvider) => {
    setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)))
  }, [])

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('metaDescription')} />

      <AppInput
        value={searchInput}
        onChange={handleSearchChange}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchLabel')}
        prefix={<SearchOutlined className='text-brand-muted' aria-hidden />}
        allowClear
        className='max-w-md'
      />

      {loadError !== null ? (
        <ErrorAlert error={loadError} onRetry={() => setRevision((current) => current + 1)} retrying={loading} />
      ) : (
        !loading && !items.length && <EmptyState title={t('empty')} description={t('emptyHint')} />
      )}

      <ul className='m-0 flex list-none flex-col gap-4 p-0'>
        {items.map((provider) => (
          // Keyed on the saved state too, so a row re-seeds its draft from what was stored.
          <AdminProviderPlanRow
            key={`${provider.id}:${provider.plan}:${provider.planExpiresAt ?? ''}`}
            provider={provider}
            onSaved={handleSaved}
          />
        ))}
      </ul>

      {total >= PAGINATION_MIN_ITEMS && total > PER_PAGE && (
        <Pagination
          current={page}
          pageSize={PER_PAGE}
          total={total}
          onChange={setPage}
          aria-label={t('pagesLabel')}
          className='self-center'
        />
      )}
    </>
  )
}
