'use client'

import { FC, useEffect, useRef, useState } from 'react'
import { initializePaddle, type PaddleEventData } from '@paddle/paddle-js'
import { Spin } from 'antd'
import { useTranslations } from 'next-intl'
import { useRouter } from '@i18n/navigation'
import { CHECKOUT_PLAN_QUERY, PADDLE_CLIENT_TOKEN, PADDLE_ENVIRONMENT } from '@constants/billing'
import { ROUTES } from '@constants/routes'
import { reportError } from '@helpers/reportError'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppParagraph } from '@components/ui/bare/AppParagraph'
import { AppTitle } from '@components/ui/bare/AppTitle'
import { ErrorState } from '@components/ui/ErrorState'

type Props = {
  /** `_ptxn`, appended by Paddle. Without it there is nothing to open. */
  transactionId?: string
  /** The plan being bought, appended by `useStartCheckout`. Absent on a link from Paddle's emails. */
  plan?: string
}

/**
 * Loads Paddle.js, which opens its checkout overlay over this page by itself — it reads
 * `_ptxn` from the address bar. A port of regionify's `PaymentCheckoutPage`, which has taken
 * live payments in both Paddle environments:
 *
 * - `checkout.completed` → the return page, which waits for the webhook to apply the plan.
 * - `checkout.closed` without a completion → back to the Plan tab, nothing bought.
 * - Paddle fires `checkout.closed` **after** `checkout.completed` too, so `completedRef`
 *   keeps a successful payment from being sent to the closed path. Regionify shipped without
 *   it once and sent paying customers to its cancel page.
 */
export const BillingCheckoutClient: FC<Props> = ({ transactionId, plan }) => {
  const t = useTranslations('Billing')
  const router = useRouter()
  const completedRef = useRef(false)
  const [initError, setInitError] = useState<unknown>(null)

  const configured = Boolean(PADDLE_CLIENT_TOKEN) && Boolean(transactionId)

  useEffect(() => {
    if (!configured) {
      reportError(new Error(PADDLE_CLIENT_TOKEN ? 'Checkout opened without a transaction' : 'Paddle client token is not set'), 'checkout')
      return
    }

    let cancelled = false

    const onEvent = (event: PaddleEventData): void => {
      if (event.name === 'checkout.completed') {
        completedRef.current = true
        router.replace({ pathname: ROUTES.billingReturn, query: plan ? { [CHECKOUT_PLAN_QUERY]: plan } : {} })
      } else if (event.name === 'checkout.closed' && !completedRef.current) {
        router.replace(ROUTES.providerProfilePlan)
      }
    }

    initializePaddle({ environment: PADDLE_ENVIRONMENT, token: PADDLE_CLIENT_TOKEN, eventCallback: onEvent }).catch(
      (error: unknown) => {
        reportError(error, 'checkout')
        if (!cancelled) setInitError(error)
      }
    )

    return () => {
      cancelled = true
    }
  }, [configured, plan, router])

  if (!configured || initError !== null) {
    return (
      <div className='flex flex-col items-center gap-2'>
        <ErrorState
          title={t('checkoutUnavailableTitle')}
          description={t('checkoutUnavailableBody')}
          error={initError ?? undefined}
        />
        <AppLink href={ROUTES.providerProfilePlan} variant='button' tone='primary'>
          {t('backToPlan')}
        </AppLink>
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center gap-4 text-center'>
      <Spin size='default' />
      <AppTitle level='h1' size='h3'>
        {t('checkoutOpening')}
      </AppTitle>
      <AppParagraph size='body-sm' className='m-0'>
        {t('checkoutSecure')}
      </AppParagraph>
    </div>
  )
}
