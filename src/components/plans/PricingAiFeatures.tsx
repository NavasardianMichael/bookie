import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { PlanCatalogueEntry } from '@interfaces/plans'
import { AI_ENTITLEMENTS, AiEntitlement } from '@constants/plans'
import { AppDescriptionList, AppDescriptionListItem } from '@components/ui/bare/AppDescriptionList'
import { AppText } from '@components/ui/bare/AppText'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { Section } from '@components/ui/layout/Section'
import { AiBadge } from './AiBadge'

type Props = {
  /** `GET /plans`, cheapest first — the allowances are read from it, never written here. */
  plans: PlanCatalogueEntry[]
}

/**
 * What each AI feature does and which plans include it, with each plan's daily allowance —
 * the half the comparison table's AI rows cannot say in a cell. antd-free and hook-only, so
 * `/pricing` renders it as HTML a crawler reads. The copy may only claim what ships
 * (docs/BILLING.md → *The catalogue*); the numbers come from the API.
 */
export const PricingAiFeatures: FC<Props> = ({ plans }) => {
  const t = useTranslations('Pricing')
  const tPlans = useTranslations('Plans')

  const allowances = (key: AiEntitlement): AppDescriptionListItem[] =>
    plans.flatMap(({ id, entitlements }) => {
      const value = entitlements[key]
      // `0` is "not on this plan" — the card lists only the plans that have it.
      if (value === 0) return []
      return [
        {
          key: id,
          label: tPlans(`names.${id}`),
          value: value === null ? tPlans('unlimited') : tPlans(`perDay.${key}`, { count: value }),
        },
      ]
    })

  return (
    <Section title={t('aiTitle')} description={t('aiSubtitle')}>
      <ResponsiveGrid as='ul' min='md' gap='sm' className='m-0 list-none p-0'>
        {AI_ENTITLEMENTS.map((key) => (
          <li key={key} className='border-brand-border rounded-brand flex flex-col gap-3 border p-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <AppText as='strong' size='body' tone='default'>
                {tPlans(`features.${key}`)}
              </AppText>
              <AiBadge />
            </div>
            <AppText size='body-sm' tone='muted'>
              {t(`ai.${key}`)}
            </AppText>
            <AppDescriptionList items={allowances(key)} size='caption' className='mt-auto' />
          </li>
        ))}
      </ResponsiveGrid>
    </Section>
  )
}
