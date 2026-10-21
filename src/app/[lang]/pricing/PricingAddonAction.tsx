'use client'

import { FC, useState } from 'react'
import { Spin } from 'antd'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { checkoutKey, useStartCheckout } from '@hooks/useStartCheckout'
import { AddonCatalogueEntry, Plan } from '@interfaces/plans'
import { USER_TYPES } from '@constants/auth'
import { ROUTES } from '@constants/routes'
import { AppButton } from '@components/ui/AppButton'
import { AppLink } from '@components/ui/bare/AppLink'

/** The contact form inside this sheet loads only after Request. */
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
  addon: AddonCatalogueEntry
  /** The signed-in provider's effective plan. Absent for a guest, a client, or a failed read. */
  currentPlan?: Plan
}

/**
 * One add-on card's call to action, by who is looking — `PricingPlanAction`'s rules:
 *
 * - **A guest or a client** is sent to provider registration; an add-on is bought once the
 *   account exists.
 * - **A provider** buys one (one pack, for capacity) through a Paddle checkout. One who is
 *   already subscribed lands on the Plan tab, where add-ons join the subscription they have
 *   (`useStartCheckout` routes `alreadySubscribed` there).
 * - **An add-on this deployment cannot sell** keeps the contact-form request, granted by hand
 *   from `/admin/providers`.
 * - **An add-on the current plan already includes** is a disabled button. The plan was
 *   purchased, so there is nothing to request or add.
 */
export const PricingAddonAction: FC<Props> = ({ addon, currentPlan }) => {
  const t = useTranslations('Pricing')
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  const { startCheckout, pending } = useStartCheckout()
  const [requesting, setRequesting] = useState(false)
  const [sheetMounted, setSheetMounted] = useState(false)

  const isProvider = isSignedOn && userType === USER_TYPES.provider
  const included = currentPlan !== undefined && addon.includedIn.includes(currentPlan)

  // `currentPlan` is read on the server, so an included add-on is disabled in the first
  // HTML. The auth store is still empty then — waiting on it would flash the guest link.
  if (currentPlan === undefined && !isProvider) {
    return (
      <AppLink href={ROUTES.providerRegistration} variant='button' tone='default'>
        {t('getStarted')}
      </AppLink>
    )
  }

  if (included) {
    return (
      <AppButton type='default' disabled>
        {addon.purchasable ? t('addAddon') : t('requestAddon')}
      </AppButton>
    )
  }

  if (addon.purchasable) {
    const cart = { addons: [{ addon: addon.id, quantity: 1 }] }
    return (
      <AppButton
        loading={pending === checkoutKey(cart)}
        disabled={pending !== null && pending !== checkoutKey(cart)}
        onClick={() => void startCheckout(cart)}
      >
        {t('addAddon')}
      </AppButton>
    )
  }

  return (
    <>
      <AppButton
        onClick={() => {
          setSheetMounted(true)
          setRequesting(true)
        }}
      >
        {t('requestAddon')}
      </AppButton>
      {sheetMounted && (
        <PlanUpgradeSheet request={requesting ? { addon: addon.id } : null} onClose={() => setRequesting(false)} />
      )}
    </>
  )
}
