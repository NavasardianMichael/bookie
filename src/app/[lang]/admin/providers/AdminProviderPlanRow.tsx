'use client'

import { FC, useState } from 'react'
import { App, DatePicker, Select, Tag } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useFormatter, useTranslations } from 'next-intl'
import { patchAdminProviderPlanAPI } from '@api/plans/main'
import { useErrorToast } from '@hooks/useErrorToast'
import { AdminProvider, Plan } from '@interfaces/plans'
import { PLAN_ORDER, PLAN_TAG_COLORS, PLANS } from '@constants/plans'
import { ROUTES } from '@constants/routes'
import { toPlanExpiryISO, toPlanLastDay, toPlanLastDayValue } from '@helpers/plans'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'
import { Surface } from '@components/ui/layout/Surface'

type Props = {
  provider: AdminProvider
  onSaved: (provider: AdminProvider) => void
}

/**
 * One provider and the two controls that set their plan: which one, and its last day.
 *
 * The draft is local to the row and the saved row comes back from the API, which is the
 * only thing that knows the effective plan after the write — an expiry picked for today
 * is still the paid plan, one in the past is refused.
 */
export const AdminProviderPlanRow: FC<Props> = ({ provider, onSaved }) => {
  const t = useTranslations('Admin.providers')
  const tPlans = useTranslations('Plans')
  const format = useFormatter()
  const { message } = App.useApp()
  const showError = useErrorToast()

  const [plan, setPlan] = useState<Plan>(provider.plan)
  const [lastDay, setLastDay] = useState<Dayjs | null>(() =>
    provider.planExpiresAt ? toPlanLastDayValue(provider.planExpiresAt) : null
  )
  const [saving, setSaving] = useState(false)

  // Free has nothing to lapse from, so its expiry is ignored — and the API drops it too.
  const planExpiresAt = plan === PLANS.free || !lastDay ? null : toPlanExpiryISO(lastDay)
  const dirty = plan !== provider.plan || planExpiresAt !== (provider.planExpiresAt ?? null)
  const lapsed = provider.effectivePlan !== provider.plan

  const lastDayLabel = (iso: string): string =>
    format.dateTime(toPlanLastDay(iso), { dateStyle: 'medium', timeZone: 'UTC' })

  const save = async () => {
    setSaving(true)
    try {
      onSaved(await patchAdminProviderPlanAPI({ id: provider.id, plan, planExpiresAt }))
      void message.success(t('saved'))
    } catch (error) {
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Surface as='li' className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-col gap-1'>
          <AppText as='strong' size='body' tone='default'>
            {provider.name}
          </AppText>
          <AppText size='body-sm' tone='muted' className='break-all'>
            {provider.email}
          </AppText>
          {provider.slug && (
            <AppText size='caption' tone='muted'>
              {`${ROUTES.providerVanity}/${provider.slug}`}
            </AppText>
          )}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {!provider.listed && <Tag>{t('unlisted')}</Tag>}
          <Tag color={PLAN_TAG_COLORS[provider.effectivePlan]}>{tPlans(`names.${provider.effectivePlan}`)}</Tag>
          {provider.billing === 'paddle' && <Tag color='cyan'>{t('paddle')}</Tag>}
          {provider.planExpiresAt &&
            (lapsed ? (
              <Tag color='red'>
                {t('ended', { plan: tPlans(`names.${provider.plan}`), date: lastDayLabel(provider.planExpiresAt) })}
              </Tag>
            ) : (
              <AppText size='caption' tone='muted'>
                {t('until', { date: lastDayLabel(provider.planExpiresAt) })}
              </AppText>
            ))}
        </div>
      </div>

      <div className='flex flex-wrap items-end gap-3'>
        <label className='flex flex-col gap-1'>
          <AppText size='caption' tone='muted'>
            {t('planLabel')}
          </AppText>
          <Select
            value={plan}
            onChange={setPlan}
            options={PLAN_ORDER.map((value) => ({ value, label: tPlans(`names.${value}`) }))}
            className='min-w-40'
          />
        </label>

        <label className='flex flex-col gap-1'>
          <AppText size='caption' tone='muted'>
            {t('lastDayLabel')}
          </AppText>
          <DatePicker
            value={plan === PLANS.free ? null : lastDay}
            onChange={(value) => setLastDay(value)}
            disabled={plan === PLANS.free}
            disabledDate={(date) => date.isBefore(dayjs(), 'day')}
            placeholder={t('noEnd')}
            allowClear
          />
        </label>

        <AppButton type='primary' onClick={() => void save()} loading={saving} disabled={!dirty}>
          {t('save')}
        </AppButton>
      </div>

      {/* A live subscription's next webhook event rewrites the plan, so a manual change is temporary. */}
      {provider.billing === 'paddle' && (
        <AppText size='caption' tone='muted'>
          {t('paddleNote')}
        </AppText>
      )}
    </Surface>
  )
}
