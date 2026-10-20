'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { PLAN_ERROR_CODES } from '@constants/plans'
import { ROUTES } from '@constants/routes'
import { processError } from '@helpers/error'
import { AppLink } from '@components/ui/bare/AppLink'

type Props = {
  error: unknown
}

/**
 * "See plans" under an import refused by the plan — today's photo spent, or a batch past the
 * monthly bookings — and nothing for any other failure, where a plan would not help.
 */
export const PlanLimitAction: FC<Props> = ({ error }) => {
  const t = useTranslations('Bookings.import')
  const { code } = processError(error)
  if (code !== PLAN_ERROR_CODES.photoImportLimit && code !== PLAN_ERROR_CODES.bookingLimit) return null

  return (
    <AppLink href={ROUTES.providerProfilePlan} variant='button' tone='default'>
      {t('seePlans')}
    </AppLink>
  )
}
