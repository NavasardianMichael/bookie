'use client'

import { FC } from 'react'
import { ContactForm } from '@app/[lang]/contact/ContactForm'
import { useTranslations } from 'next-intl'
import { Plan } from '@interfaces/plans'
import { AppSheet } from '@components/ui/AppSheet'

type Props = {
  /** The plan being asked for; `null` keeps the sheet closed. */
  plan: Plan | null
  onClose: () => void
}

/**
 * "Request this plan", until a payment provider is wired in (docs/BILLING.md): the contact
 * form in a sheet, sent with `topic: 'planUpgrade'` so the admin inbox reads
 * "Plan upgrade request — basic — Anna Petrosyan" and the plan is assigned from
 * `/admin/providers`. Shared by the Plan tab and `/pricing`.
 *
 * Keyed on the plan, so asking about another plan starts a fresh form rather than carrying
 * the last request's message over.
 */
export const PlanUpgradeSheet: FC<Props> = ({ plan, onClose }) => {
  const t = useTranslations('Plans')

  return (
    <AppSheet open={plan !== null} onClose={onClose} title={plan ? t('requestTitle', { plan: t(`names.${plan}`) }) : ''}>
      {plan && <ContactForm key={plan} topic='planUpgrade' plan={plan} />}
    </AppSheet>
  )
}
