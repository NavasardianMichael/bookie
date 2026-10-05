import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { PRICING_INCLUDED } from '@constants/pricing'
import { AppText } from '@components/ui/bare/AppText'
import { CheckCircleIcon } from '@components/ui/icons'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { Section } from '@components/ui/layout/Section'

/**
 * What every plan includes, Free too — the half of the offer the comparison table cannot
 * show, because it does not differ between plans. antd-free, so it is in the HTML a crawler
 * reads. The list is `PRICING_INCLUDED`, which claims only what ships.
 */
export const PricingIncluded: FC = () => {
  const t = useTranslations('Pricing')

  return (
    <Section title={t('includedTitle')} description={t('includedSubtitle')}>
      <ResponsiveGrid as='ul' min='md' gap='sm' className='m-0 list-none p-0'>
        {PRICING_INCLUDED.map((key) => (
          <li key={key} className='flex items-start gap-2'>
            <CheckCircleIcon className='text-brand mt-0.5 h-5 w-5 shrink-0' />
            <AppText size='body-sm' tone='default'>
              {t(`included.${key}`)}
            </AppText>
          </li>
        ))}
      </ResponsiveGrid>
    </Section>
  )
}
