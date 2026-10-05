'use client'

import { FC } from 'react'
import { Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { useAwaitPlan } from '@hooks/useAwaitPlan'
import { Plan } from '@interfaces/plans'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { CheckCircleIcon } from '@components/ui/icons'

type Props = {
  /** The paid plan just bought, or null when the checkout did not say (a link from Paddle's emails). */
  plan: Plan | null
}

/**
 * After the overlay reports `checkout.completed`: the payment is taken, but the plan is
 * applied by Paddle's webhook, seconds later. This waits for it (`useAwaitPlan`) so the
 * provider is told "you are on Standard" only once that is true.
 *
 * A timeout still reads as success — the money has moved, and a webhook a minute late is
 * far likelier than a lost one — with a note that the plan may take a moment to show.
 */
export const BillingReturnClient: FC<Props> = ({ plan }) => {
  const t = useTranslations('Billing')
  const tPlans = useTranslations('Plans')
  const state = useAwaitPlan(plan)

  const backToPlan = (
    <AppLink href={ROUTES.providerProfilePlan} variant='button' tone='primary'>
      {t('backToPlan')}
    </AppLink>
  )

  if (plan && state.status === 'waiting') {
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

  return (
    <div className='flex flex-col items-center gap-4 text-center' role='status'>
      <CheckCircleIcon className='text-brand-success h-12 w-12' />
      <AppTitle level='h1' size='h3'>
        {plan && state.status === 'done' ? t('activeTitle', { plan: tPlans(`names.${plan}`) }) : t('receivedTitle')}
      </AppTitle>
      <AppParagraph size='body-sm' className='m-0'>
        {plan && state.status === 'done' ? t('activeBody') : t('receivedBody')}
      </AppParagraph>
      {backToPlan}
    </div>
  )
}
