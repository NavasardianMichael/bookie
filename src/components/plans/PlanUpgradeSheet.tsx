'use client'

import { FC, useState } from 'react'
import { ContactForm } from '@app/[lang]/contact/ContactForm'
import { useTranslations } from 'next-intl'
import { Addon, Plan } from '@interfaces/plans'
import { AppSheet } from '@components/ui/AppSheet'

/** What is being asked for: a plan, or an add-on (with a pack count where it has one). */
export type UpgradeRequest = { plan: Plan } | { addon: Addon; quantity?: number }

type Props = {
  /** `null` keeps the sheet closed. */
  request: UpgradeRequest | null
  onClose: () => void
}

/**
 * "Request this plan" or "Request this add-on", for something this deployment does not sell
 * through Paddle (`purchasable: false` — no key or price configured; docs/BILLING.md): the
 * contact form in a sheet, sent with `topic: 'planUpgrade'` or `'addonRequest'` so the admin
 * inbox reads "Plan upgrade request — basic — Anna Petrosyan" and it is granted from
 * `/admin/providers`. Shared by the Plan tab and `/pricing`.
 *
 * Keyed on what is asked for, so asking about something else starts a fresh form rather
 * than carrying the last request's message over.
 */
export const PlanUpgradeSheet: FC<Props> = ({ request, onClose }) => {
  const t = useTranslations('Plans')
  /** A request in flight: the sheet cannot be dismissed until it lands or fails. */
  const [pending, setPending] = useState(false)

  const title = !request
    ? ''
    : 'plan' in request
      ? t('requestTitle', { plan: t(`names.${request.plan}`) })
      : t('addonRequestTitle', { addon: t(`addons.${request.addon}.name`) })

  return (
    <AppSheet open={request !== null} onClose={onClose} title={title} pending={pending}>
      {request &&
        ('plan' in request ? (
          <ContactForm key={request.plan} topic='planUpgrade' plan={request.plan} onPendingChange={setPending} />
        ) : (
          <ContactForm
            key={request.addon}
            topic='addonRequest'
            addon={request.addon}
            quantity={request.quantity}
            onPendingChange={setPending}
          />
        ))}
    </AppSheet>
  )
}
