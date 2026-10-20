'use client'

import { FC } from 'react'
import { Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { useAwaitPlan } from '@hooks/useAwaitPlan'
import { Plan } from '@interfaces/plans'
import { ROUTES } from '@constants/routes'
import { BillingTarget } from '@helpers/plans'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CheckCircleIcon } from '@components/ui/icons'

type Props = {
  /** The paid plan in the cart, or null when it held add-ons alone or did not say (a link from Paddle's emails). */
  plan: Plan | null
}

/** A checkout's own items can change inside Paddle's overlay, so it waits for any live subscription. */
const SUBSCRIBED: BillingTarget = { kind: 'subscribed' }

/**
 * After the overlay reports `checkout.completed`: the payment is taken, but what it bought
 * is applied by Paddle's webhook, seconds later. This waits for it (`useAwaitPlan`) so the
 * provider is told "you are on Standard" only once that is true.
 *
 * It waits for a **live subscription**, not for the exact cart: the overlay lets the buyer
 * change a pack's quantity or remove an item, so what was sent is not necessarily what was
 * bought. A plan is named only when it is the one in force.
 *
 * A timeout still reads as success — the money has moved, and a webhook a minute late is
 * far likelier than a lost one — with a note that the change may take a moment to show.
 */
export const BillingReturnClient: FC<Props> = ({ plan }) => {
  const t = useTranslations('Billing')
  const tPlans = useTranslations('Plans')
  const state = useAwaitPlan(SUBSCRIBED)

  const backToPlan = (
    <AppLink href={ROUTES.providerProfilePlan} variant='button' tone='primary'>
      {t('backToPlan')}
    </AppLink>
  )

  if (state.status === 'waiting') {
    return (
      <div className='flex flex-col items-center gap-4 text-center' role='status'>
        <Spin />
        <AppTitle level='h1' size='h3'>
          {t('confirmingTitle')}
        </AppTitle>
        <AppParagraph size='body-sm' className='m-0'>
          {t('confirmingBody')}
        </AppParagraph>
      </div>
    )
  }

  const onPlan = state.status === 'done' && plan !== null && state.current.effectivePlan === plan

  return (
    <div className='flex flex-col items-center gap-4 text-center' role='status'>
      <CheckCircleIcon className='text-brand-success h-12 w-12' />
      <AppTitle level='h1' size='h3'>
        {onPlan
          ? t('activeTitle', { plan: tPlans(`names.${plan}`) })
          : state.status === 'done'
            ? t('purchaseActiveTitle')
            : t('receivedTitle')}
      </AppTitle>
      <AppParagraph size='body-sm' className='m-0'>
        {onPlan ? t('activeBody') : state.status === 'done' ? t('purchaseActiveBody') : t('receivedBody')}
      </AppParagraph>
      {backToPlan}
    </div>
  )
}
