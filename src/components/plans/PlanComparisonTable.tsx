import { FC, ReactNode } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { Entitlements, Plan, PlanCatalogueEntry } from '@interfaces/plans'
import { cn } from '@helpers/cn'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  /** `GET /plans`, cheapest first. Rendered in that order — the API decides it. */
  plans: PlanCatalogueEntry[]
  /** Highlighted as "your plan" — the Plan tab passes the effective plan; `/pricing` passes nothing. */
  currentPlan?: Plan
  /** One call to action under each column, or none. */
  renderAction?: (plan: Plan) => ReactNode
  /** The table's accessible name. */
  caption: string
  className?: string
}

const FEATURE_ROWS: (keyof Entitlements)[] = [
  'maxActiveServices',
  'maxBookingsPerMonth',
  'analyticsHistoryDays',
  'customSlug',
]

/**
 * Every plan side by side, one row per limit — the same table on `/pricing` and on the
 * provider's Plan tab, so the two can never describe the plans differently.
 *
 * antd-free and hook-only (no `'use client'`), so `/pricing` renders it as HTML a crawler
 * reads, and the Plan tab's client island can render it too. The values come from the API
 * (`GET /plans`); nothing here knows a limit. A real `<table>` in an `overflow-x-auto` box:
 * four plans do not fit a phone's width, and a table is the one thing allowed to scroll.
 */
export const PlanComparisonTable: FC<Props> = ({ plans, currentPlan, renderAction, caption, className }) => {
  const t = useTranslations('Plans')
  const format = useFormatter()

  const cell = (key: keyof Entitlements, value: Entitlements[keyof Entitlements]): string => {
    if (key === 'customSlug') return value ? t('included') : t('notIncluded')
    if (value === null) return key === 'analyticsHistoryDays' ? t('fullHistory') : t('unlimited')
    if (key === 'analyticsHistoryDays') return t('days', { count: Number(value) })
    return format.number(Number(value))
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className='w-full min-w-xl border-collapse text-start'>
        <caption className='sr-only'>{caption}</caption>
        <thead>
          <tr>
            <th scope='col' className='w-1/5' />
            {plans.map(({ id }) => (
              <th
                key={id}
                scope='col'
                aria-current={id === currentPlan ? 'true' : undefined}
                className={cn(
                  'border-brand-border border-b px-3 py-3 text-start align-bottom',
                  id === currentPlan && 'bg-brand-50 rounded-t-brand-sm'
                )}
              >
                {id === currentPlan && (
                  <AppText size='overline' tone='brand' className='block font-semibold'>
                    {t('current')}
                  </AppText>
                )}
                <AppText size='body' tone='default' className='block font-bold'>
                  {t(`names.${id}`)}
                </AppText>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_ROWS.map((key) => (
            <tr key={key}>
              <th scope='row' className='border-brand-border border-b px-3 py-3 text-start align-top'>
                <AppText size='body-sm' tone='muted' className='font-semibold'>
                  {t(`features.${key}`)}
                </AppText>
              </th>
              {plans.map(({ id, entitlements }) => (
                <td
                  key={id}
                  className={cn('border-brand-border border-b px-3 py-3 align-top', id === currentPlan && 'bg-brand-50')}
                >
                  <AppText size='body-sm' tone='default' numeric>
                    {cell(key, entitlements[key])}
                  </AppText>
                </td>
              ))}
            </tr>
          ))}
          {renderAction && (
            <tr>
              <td />
              {plans.map(({ id }) => (
                <td key={id} className={cn('px-3 py-4 align-top', id === currentPlan && 'bg-brand-50 rounded-b-brand-sm')}>
                  {renderAction(id)}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
