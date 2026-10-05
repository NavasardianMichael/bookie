'use client'

import { FC, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useStartCheckout } from '@hooks/useStartCheckout'
import { Plan } from '@interfaces/plans'
import { USER_TYPES } from '@constants/auth'
import { PLANS } from '@constants/plans'
import { ROUTES } from '@constants/routes'
import { PlanUpgradeSheet } from '@components/plans/PlanUpgradeSheet'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'

type Props = {
  plan: Plan
  /** Whether this deployment sells the plan through Paddle (`GET /plans`). */
  purchasable: boolean
}

/**
 * One column's call to action, by who is looking:
 *
 * - **A guest or a client** is sent to provider registration — a real anchor, so it works
 *   before hydration. A plan is chosen once the account exists, on the Plan tab.
 * - **A provider** buys it: the column starts a Paddle checkout (`useStartCheckout`). One
 *   already subscribed lands on the Plan tab, where switching lives. Free sends them there
 *   too, since leaving a paid plan is a cancellation, done in Paddle's billing portal.
 * - **A plan this deployment cannot sell** (no Paddle key or price) keeps the contact-form
 *   request it had before checkout existed, assigned by hand from `/admin/providers`.
 *
 * The session comes from the auth store, so a signed-in provider sees the guest link until
 * the Header's `getMe()` lands — the same settle the footer's links make.
 */
export const PricingPlanAction: FC<Props> = ({ plan, purchasable }) => {
  const t = useTranslations('Pricing')
  const tPlans = useTranslations('Plans')
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  const { startCheckout, pendingPlan } = useStartCheckout()
  const [requesting, setRequesting] = useState(false)

  const isProvider = isSignedOn && userType === USER_TYPES.provider

  if (!isProvider) {
    return (
      <AppLink href={ROUTES.providerRegistration} variant='button' tone={plan === PLANS.free ? 'default' : 'primary'}>
        {plan === PLANS.free ? t('startFree') : t('getStarted')}
      </AppLink>
    )
  }

  if (plan === PLANS.free) {
    return (
      <AppLink href={ROUTES.providerProfilePlan} variant='button' tone='default'>
        {t('seeYourPlan')}
      </AppLink>
    )
  }

  if (purchasable) {
    return (
      <AppButton
        type='primary'
        loading={pendingPlan === plan}
        disabled={pendingPlan !== null && pendingPlan !== plan}
        onClick={() => void startCheckout(plan)}
      >
        {t('choosePlan', { plan: tPlans(`names.${plan}`) })}
      </AppButton>
    )
  }

  return (
    <>
      <AppButton type='primary' onClick={() => setRequesting(true)}>
        {t('requestPlan')}
      </AppButton>
      <PlanUpgradeSheet plan={requesting ? plan : null} onClose={() => setRequesting(false)} />
    </>
  )
}
