'use client'

import { FC } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { usePlanPrices } from '@hooks/usePlanPrices'
import { Addon, PlanPrice } from '@interfaces/plans'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  addon: Addon
  /** The USD price of one unit, from `GET /plans/addons`. */
  price: PlanPrice
  /** A capacity pack, priced per pack rather than per add-on. */
  perPack?: boolean
}

/**
 * An add-on's monthly price — `PlanPrice`'s twin for the add-on list. The USD price renders
 * first (in the server HTML on `/pricing`), then Paddle's preview for this visitor replaces
 * it with their local currency, tax included (`usePlanPrices`, one request per page).
 */
export const AddonPrice: FC<Props> = ({ addon, price, perPack = false }) => {
  const t = useTranslations('Plans')
  const format = useFormatter()
  const localized = usePlanPrices()

  const amount =
    localized?.[addon] ?? format.number(price.amountCents / 100, { style: 'currency', currency: price.currency })

  return (
    <span className='block'>
      <AppText size='body' tone='default' numeric className='font-bold'>
        {amount}
      </AppText>{' '}
      <AppText size='caption' tone='muted'>
        {perPack ? t('perPackPerMonth') : t('perMonth')}
      </AppText>
    </span>
  )
}
