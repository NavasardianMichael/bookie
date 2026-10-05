'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { usePlanPrices } from '@hooks/usePlanPrices'
import { AppParagraph } from '@components/ui/bare/AppParagraph'

/**
 * What the prices in the table mean, which depends on what arrived: Paddle's localized
 * totals include tax, the USD fallback does not. Shares `usePlanPrices`'s one request.
 */
export const PricingCurrencyNote: FC = () => {
  const t = useTranslations('Pricing')
  const prices = usePlanPrices()
  const localized = prices !== null && Object.values(prices).some(Boolean)

  return (
    <AppParagraph size='body-sm' className='m-0'>
      {localized ? t('localCurrencyNote') : t('usdNote')}
    </AppParagraph>
  )
}
