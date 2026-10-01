'use client'

import { FC, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plan } from '@interfaces/plans'
import { PLANS } from '@constants/plans'
import { ROUTES } from '@constants/routes'
import { PlanUpgradeSheet } from '@components/plans/PlanUpgradeSheet'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'

type Props = {
  plan: Plan
}

/**
 * One column's call to action. Free is a link to provider registration — a real anchor, so
 * it works before hydration. A paid plan opens the request sheet: there is no checkout yet,
 * so asking is how a plan is bought.
 */
export const PricingPlanAction: FC<Props> = ({ plan }) => {
  const t = useTranslations('Pricing')
  const [open, setOpen] = useState(false)

  if (plan === PLANS.free) {
    return (
      <AppLink href={ROUTES.providerRegistration} variant='button'>
        {t('startFree')}
      </AppLink>
    )
  }

  return (
    <>
      <AppButton type='primary' onClick={() => setOpen(true)}>
        {t('requestPlan')}
      </AppButton>
      <PlanUpgradeSheet plan={open ? plan : null} onClose={() => setOpen(false)} />
    </>
  )
}
