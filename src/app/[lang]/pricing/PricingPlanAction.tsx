'use client'

import { FC, useState } from 'react'
import { Spin } from 'antd'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useStartCheckout } from '@hooks/useStartCheckout'
import { Plan } from '@interfaces/plans'
import { USER_TYPES } from '@constants/auth'
import { PLAN_ORDER, PLANS } from '@constants/plans'
import { ROUTES } from '@constants/routes'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'

/** The contact form inside this sheet loads only after Request plan. */
const PlanUpgradeSheet = dynamic(
  () => import('@components/plans/PlanUpgradeSheet').then((mod) => mod.PlanUpgradeSheet),
  {
    loading: () => (
      <div className='flex justify-center py-10'>
        <Spin />
      </div>
    ),
  }
)

type Props = {
  plan: Plan
  /** The signed-in provider's effective plan. Absent for a guest, a client, or a failed read. */
  currentPlan?: Plan
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
 * Their column and every cheaper one are disabled. A provider whose plan could not be read
 * still waits on the auth store, and sees the guest link until `getMe()` lands.
 */
const rank = (plan: Plan): number => PLAN_ORDER.indexOf(plan)

export const PricingPlanAction: FC<Props> = ({ plan, currentPlan, purchasable }) => {
  const t = useTranslations('Pricing')
  const tPlans = useTranslations('Plans')
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  const { startCheckout, pending } = useStartCheckout()
  const [requesting, setRequesting] = useState(false)
  const [sheetMounted, setSheetMounted] = useState(false)

  const isProvider = isSignedOn && userType === USER_TYPES.provider
  const heldOrBelow = currentPlan !== undefined && rank(plan) <= rank(currentPlan)

  // `currentPlan` is read on the server, so a provider's column is right in the first
  // HTML. The auth store is still empty then — waiting on it would flash the guest link.
  if (currentPlan === undefined && !isProvider) {
    return (
      <AppLink href={ROUTES.providerRegistration} variant='button' tone={plan === PLANS.free ? 'default' : 'primary'}>
        {plan === PLANS.free ? t('startFree') : t('getStarted')}
      </AppLink>
    )
  }

  if (heldOrBelow) {
    return (
      <AppButton type='default' disabled>
        {plan === currentPlan ? tPlans('current') : t('choosePlan', { plan: tPlans(`names.${plan}`) })}
      </AppButton>
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
        loading={pending === plan}
        disabled={pending !== null && pending !== plan}
        onClick={() => void startCheckout({ plan })}
      >
        {t('choosePlan', { plan: tPlans(`names.${plan}`) })}
      </AppButton>
    )
  }

  return (
    <>
      <AppButton
        type='primary'
        onClick={() => {
          setSheetMounted(true)
          setRequesting(true)
        }}
      >
        {t('requestPlan')}
      </AppButton>
      {sheetMounted && <PlanUpgradeSheet request={requesting ? { plan } : null} onClose={() => setRequesting(false)} />}
    </>
  )
}
