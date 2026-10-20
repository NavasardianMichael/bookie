'use client'

import { useCallback, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { postCheckoutAPI } from '@api/billing/main'
import { CheckoutCart } from '@api/billing/types'
import { useErrorToast } from '@hooks/useErrorToast'
import { useRouter } from '@i18n/navigation'
import { BILLING_ERROR_CODES, CHECKOUT_PLAN_QUERY } from '@constants/billing'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'

/** Names a cart for a busy button: `basic`, `customSlug`, `basic+extraServices`. */
export const checkoutKey = (cart: CheckoutCart): string =>
  [cart.plan, ...(cart.addons ?? []).map((line) => line.addon)].filter(Boolean).join('+')

/**
 * Starts a subscription — the regionify flow — for a plan, add-ons, or both. The API creates a
 * Paddle transaction and answers its checkout URL, a page on our own domain carrying
 * `?_ptxn=`; the browser goes there and Paddle.js opens the overlay (`/billing/checkout`). A
 * plan is appended so the return page can name it.
 *
 * A full navigation, not a router push: the checkout page must load Paddle.js afresh with
 * `_ptxn` in its URL. `pending` therefore stays set until the page unloads, keeping the button
 * busy rather than flashing back to idle.
 *
 * Already subscribed (another tab, a double click, or a subscriber adding to what they have)
 * goes to the Plan tab, where changes live, instead of an error.
 */
export const useStartCheckout = (): { startCheckout: (cart: CheckoutCart) => Promise<void>; pending: string | null } => {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('Pricing')
  const showError = useErrorToast()
  const [pending, setPending] = useState<string | null>(null)

  const startCheckout = useCallback(
    async (cart: CheckoutCart) => {
      setPending(checkoutKey(cart))
      try {
        const checkoutUrl = new URL(await postCheckoutAPI({ ...cart, locale }))
        if (cart.plan) checkoutUrl.searchParams.set(CHECKOUT_PLAN_QUERY, cart.plan)
        window.location.assign(checkoutUrl.toString())
      } catch (error) {
        setPending(null)
        if (processError(error).code === BILLING_ERROR_CODES.alreadySubscribed) {
          router.push(ROUTES.providerProfilePlan)
          return
        }
        showError(error, { title: t('checkoutFailed'), key: 'checkout' })
      }
    },
    [locale, router, showError, t]
  )

  return { startCheckout, pending }
}
