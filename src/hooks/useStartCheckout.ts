'use client'

import { useCallback, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { postCheckoutAPI } from '@api/billing/main'
import { useErrorToast } from '@hooks/useErrorToast'
import { PaidPlan } from '@interfaces/plans'
import { useRouter } from '@i18n/navigation'
import { BILLING_ERROR_CODES, CHECKOUT_PLAN_QUERY } from '@constants/billing'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'

/**
 * Starts a subscription — the regionify flow. The API creates a Paddle transaction and
 * answers its checkout URL, a page on our own domain carrying `?_ptxn=`; the browser goes
 * there and Paddle.js opens the overlay (`/billing/checkout`). The plan is appended so the
 * return page knows what it is waiting for.
 *
 * A full navigation, not a router push: the checkout page must load Paddle.js afresh with
 * `_ptxn` in its URL. `pendingPlan` therefore stays set until the page unloads, keeping the
 * button busy rather than flashing back to idle.
 *
 * Already subscribed (another tab, a double click) goes to the Plan tab, where switching
 * lives, instead of an error.
 */
export const useStartCheckout = (): { startCheckout: (plan: PaidPlan) => Promise<void>; pendingPlan: PaidPlan | null } => {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('Pricing')
  const showError = useErrorToast()
  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null)

  const startCheckout = useCallback(
    async (plan: PaidPlan) => {
      setPendingPlan(plan)
      try {
        const checkoutUrl = new URL(await postCheckoutAPI({ plan, locale }))
        checkoutUrl.searchParams.set(CHECKOUT_PLAN_QUERY, plan)
        window.location.assign(checkoutUrl.toString())
      } catch (error) {
        setPendingPlan(null)
        if (processError(error).code === BILLING_ERROR_CODES.alreadySubscribed) {
          router.push(ROUTES.providerProfilePlan)
          return
        }
        showError(error, { title: t('checkoutFailed'), key: 'checkout' })
      }
    },
    [locale, router, showError, t]
  )

  return { startCheckout, pendingPlan }
}
