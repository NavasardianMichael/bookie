'use client'

import { FC } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { usePlanPrices } from '@hooks/usePlanPrices'
import { Plan, PlanPrice as PlanPriceValue } from '@interfaces/plans'
import { PLANS } from '@constants/plans'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  plan: Plan
  price: PlanPriceValue
}

/**
 * A plan's monthly price under its name in the comparison table.
 *
 * The USD price from `GET /plans` renders first — in the server HTML on `/pricing`, so a
 * crawler and a visitor without JavaScript both see a real price. Once Paddle's preview for
 * this visitor arrives (`usePlanPrices`), it is swapped for their local currency, tax
 * included — what they will actually be charged. antd-free, like the table it sits in.
 */
export const PlanPrice: FC<Props> = ({ plan, price }) => {
  const t = useTranslations('Plans')
  const format = useFormatter()
  const localized = usePlanPrices()

  if (plan === PLANS.free || price.amountCents === 0) {
    return (
      <AppText size='body-sm' tone='muted' className='block'>
        {t('freeForever')}
      </AppText>
    )
  }

  const amount =
    localized?.[plan] ?? format.number(price.amountCents / 100, { style: 'currency', currency: price.currency })

  return (
    <span className='block'>
      <AppText size='body' tone='default' numeric className='font-bold'>
        {amount}
      </AppText>{' '}
      <AppText size='caption' tone='muted'>
        {t('perMonth')}
      </AppText>
    </span>
  )
}
