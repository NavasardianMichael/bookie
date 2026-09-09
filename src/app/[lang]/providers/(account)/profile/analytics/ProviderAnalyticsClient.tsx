'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Segmented } from 'antd'
import dayjs from 'dayjs'
import { useFormatter, useTranslations } from 'next-intl'
import { getProviderAnalyticsAPI } from '@api/analytics/main'
import { CurrencyTotal, ProviderAnalytics } from '@api/analytics/types'
import { getProviderProfileAPI } from '@api/providers/main'
import { processError } from '@helpers/error'
import { AppText } from '@components/ui/bare/AppText'
import { BarChart, BarChartDatum } from '@components/ui/bare/BarChart'
import { EmptyState } from '@components/ui/EmptyState'
import { PageHeader } from '@components/ui/layout/PageHeader'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { Surface } from '@components/ui/layout/Surface'
import { StatTile } from '@components/ui/StatTile'

const RANGE_DAYS = [7, 30, 90, 365] as const

type RangeDays = (typeof RANGE_DAYS)[number]

/**
 * The provider's numbers over a chosen window.
 *
 * **Revenue is never one number.** `Service.currency` is free-form text, so the API
 * returns a total per currency and this page leads with the largest and says how many
 * others there are. Adding them would be a wrong answer rather than an approximate one —
 * which is the reason the tile renders a currency code beside the figure even when there
 * is only one.
 *
 * **Rates are null, not zero, before anything settles.** A provider whose first bookings
 * are still in the future has no completion rate; rendering `0%` would read as a failure
 * rather than as an absence.
 */
export const ProviderAnalyticsClient = () => {
  const t = useTranslations('Settings.analytics')
  const format = useFormatter()

  const [rangeDays, setRangeDays] = useState<RangeDays>(30)
  const [data, setData] = useState<ProviderAnalytics | null>(null)
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  /**
   * The window as one memoized object, which doubles as the request's identity — so
   * `loading` is derived rather than set at the top of the effect
   * (`react-hooks/set-state-in-effect` is an error here), and the clock is read once per
   * range change rather than on every render.
   */
  const range = useMemo(() => {
    const to = dayjs()
    return { from: to.subtract(rangeDays, 'day').toISOString(), to: to.toISOString() }
  }, [rangeDays])

  const [fulfilled, setFulfilled] = useState<object | null>(null)
  const loading = fulfilled !== range

  useEffect(() => {
    let cancelled = false

    void getProviderAnalyticsAPI(range)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(processError(err).message)
      })
      .finally(() => {
        if (!cancelled) setFulfilled(range)
      })

    return () => {
      cancelled = true
    }
  }, [range])

  // Service names live on the profile, not on the analytics payload — the aggregate
  // returns ids so it never has to join a table it only needs for labels.
  useEffect(() => {
    void getProviderProfileAPI()
      .then((profile) => {
        setServiceNames(
          Object.fromEntries(profile.services.allIds.map((id) => [id, profile.services.byId[id]?.name ?? id]))
        )
      })
      .catch(() => setServiceNames({}))
  }, [])

  const percent = (value: number | null): string =>
    value === null ? '—' : format.number(value, { style: 'percent', maximumFractionDigits: 1 })

  /** The largest currency total, which is what the tile shows. */
  const leadRevenue = (totals: CurrencyTotal[]): CurrencyTotal | undefined => totals[0]

  const revenueDelta = useMemo(() => {
    if (!data) return null
    const current = leadRevenue(data.totals.revenue)
    if (!current) return null
    const previous = data.previous.revenue.find((entry) => entry.currency === current.currency)
    if (!previous?.total) return null
    return (current.total - previous.total) / previous.total
  }, [data])

  const bookingsDelta = useMemo(() => {
    if (!data?.previous.bookings) return null
    return (data.totals.bookings - data.previous.bookings) / data.previous.bookings
  }, [data])

  const deltaHint = (delta: number | null): string =>
    delta === null
      ? t('noPrevious')
      : t('vsPrevious', {
          change: format.number(delta, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }),
        })

  const seriesData: BarChartDatum[] = useMemo(
    () =>
      (data?.series ?? []).map((point) => ({
        key: point.day,
        label: dayjs(point.day).format('D'),
        name: dayjs(point.day).format('ddd D MMM'),
        value: point.bookings,
      })),
    [data]
  )

  const weekdayData: BarChartDatum[] = useMemo(
    () =>
      (data?.byWeekday ?? []).map((entry) => {
        // `byWeekday` is Monday-first; dayjs `day()` is Sunday-first.
        const label = dayjs().day((entry.weekday + 1) % 7).format('ddd')
        return { key: String(entry.weekday), label, name: label, value: entry.bookings }
      }),
    [data]
  )

  const hourData: BarChartDatum[] = useMemo(
    () =>
      (data?.byHour ?? []).map((entry) => ({
        key: String(entry.hour),
        label: String(entry.hour).padStart(2, '0'),
        name: `${String(entry.hour).padStart(2, '0')}:00`,
        value: entry.bookings,
      })),
    [data]
  )

  const topServices = useMemo(() => (data?.topServices ?? []).slice(0, 5), [data])

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Segmented<RangeDays>
            value={rangeDays}
            onChange={setRangeDays}
            options={RANGE_DAYS.map((days) => ({ value: days, label: t('range', { days }) }))}
          />
        }
      />

      {error && <Alert type='error' showIcon message={error} />}

      {loading ? (
        <div className='flex flex-col gap-6'>
          <div className='bg-brand-100 h-28 animate-pulse rounded-brand' />
          <div className='bg-brand-100 h-72 animate-pulse rounded-brand' />
        </div>
      ) : !data || data.totals.bookings === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
      ) : (
        <>
          <ResponsiveGrid min='sm'>
            <StatTile label={t('statBookings')} value={data.totals.bookings} hint={deltaHint(bookingsDelta)} />
            <StatTile
              label={t('statRevenue')}
              value={
                leadRevenue(data.totals.revenue)
                  ? `${format.number(leadRevenue(data.totals.revenue)!.total, { maximumFractionDigits: 2 })} ${leadRevenue(data.totals.revenue)!.currency}`
                  : '—'
              }
              hint={
                data.totals.revenue.length > 1
                  ? t('moreCurrencies', { count: data.totals.revenue.length - 1 })
                  : deltaHint(revenueDelta)
              }
            />
            <StatTile label={t('statCompletion')} value={percent(data.rates.completion)} hint={t('ofSettled')} />
            <StatTile
              tone='brand'
              label={t('statNoShow')}
              value={percent(data.rates.noShow)}
              hint={t('cancelledCount', { count: data.totals.cancelled })}
            />
          </ResponsiveGrid>

          {data.totals.revenue.length > 1 && (
            <Alert
              type='info'
              showIcon
              message={t('multiCurrencyTitle')}
              description={
                <span>
                  {data.totals.revenue
                    .map((entry) => `${format.number(entry.total, { maximumFractionDigits: 2 })} ${entry.currency}`)
                    .join(' · ')}
                </span>
              }
            />
          )}

          <Surface>
            <BarChart
              title={t('chartPerDay')}
              caption={t('chartPerDayCaption', { days: rangeDays })}
              data={seriesData}
              emptyLabel={t('chartEmpty')}
              valueLabel={t('chartDayLabel')}
            />
          </Surface>

          <div className='grid gap-6 lg:grid-cols-2'>
            <Surface>
              <BarChart
                title={t('chartWeekday')}
                caption={t('chartWeekdayCaption')}
                data={weekdayData}
                emptyLabel={t('chartEmpty')}
                valueLabel={t('chartWeekdayLabel')}
              />
            </Surface>
            <Surface>
              <BarChart
                title={t('chartHour')}
                caption={t('chartHourCaption')}
                data={hourData}
                emptyLabel={t('chartEmpty')}
                valueLabel={t('chartHourLabel')}
              />
            </Surface>
          </div>

          <div className='grid gap-6 lg:grid-cols-2'>
            <Surface className='flex flex-col gap-4'>
              <AppText size='overline' tone='muted' className='font-semibold'>
                {t('topServices')}
              </AppText>
              {topServices.length === 0 ? (
                <AppText size='body-sm' tone='muted'>
                  {t('chartEmpty')}
                </AppText>
              ) : (
                <ul className='flex list-none flex-col gap-2 p-0'>
                  {topServices.map((service) => (
                    <li key={service.serviceId} className='flex items-baseline justify-between gap-4'>
                      <AppText size='body-sm' tone='default' className='min-w-0 truncate'>
                        {serviceNames[service.serviceId] ?? t('unknownService')}
                      </AppText>
                      <AppText size='body-sm' tone='muted' className='tnum shrink-0 font-semibold'>
                        {t('bookingCount', { count: service.bookings })}
                      </AppText>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>

            <Surface className='flex flex-col gap-4'>
              <AppText size='overline' tone='muted' className='font-semibold'>
                {t('clients')}
              </AppText>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <AppText size='caption' tone='muted' className='block'>
                    {t('clientsTotal')}
                  </AppText>
                  <AppText size='body' tone='default' className='tnum block text-h3 font-extrabold'>
                    {data.clients.total}
                  </AppText>
                </div>
                <div>
                  <AppText size='caption' tone='muted' className='block'>
                    {t('clientsReturning')}
                  </AppText>
                  <AppText size='body' tone='default' className='tnum block text-h3 font-extrabold'>
                    {data.clients.returning}
                  </AppText>
                </div>
              </div>
              <AppText size='caption' tone='muted'>
                {data.medianLeadTimeHours === null
                  ? t('noLeadTime')
                  : t('leadTime', { hours: Math.round(data.medianLeadTimeHours) })}
              </AppText>
            </Surface>
          </div>
        </>
      )}
    </div>
  )
}
