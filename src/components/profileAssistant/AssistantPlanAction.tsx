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

/** The plan answers the assistant can meet — today's drafts spent, services past the cap. */
const PLAN_LIMITS: readonly number[] = [
  PLAN_ERROR_CODES.profileAssistantLimit,
  PLAN_ERROR_CODES.serviceLimit,
  PLAN_ERROR_CODES.featureLocked,
]

/**
 * "See plans" under an assistant failure the plan caused, and nothing for any other failure,
 * where a plan would not help — photo import's `PlanLimitAction`, for this feature's codes.
 */
export const AssistantPlanAction: FC<Props> = ({ error }) => {
  const t = useTranslations('Settings.assistant')
  if (!PLAN_LIMITS.includes(processError(error).code)) return null

  return (
    <AppLink href={ROUTES.providerProfilePlan} variant='button' tone='default'>
      {t('seePlans')}
    </AppLink>
  )
}
