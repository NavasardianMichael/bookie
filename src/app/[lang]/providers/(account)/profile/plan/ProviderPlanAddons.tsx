'use client'

import { FC, ReactNode } from 'react'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import { useFormatter, useTranslations } from 'next-intl'
import { checkoutKey } from '@hooks/useStartCheckout'
import { AddonCatalogueEntry, Plan, ProviderAddon } from '@interfaces/plans'
import { ADDON_SOURCES } from '@constants/plans'
import { heldQuantity, toPlanLastDay } from '@helpers/plans'
import { AddonCatalogue } from '@components/plans/AddonCatalogue'
import { AppButton } from '@components/ui/AppButton'

type Props = {
  /** `GET /plans/addons`. */
  addons: AddonCatalogueEntry[]
  /** What the provider holds now, one row per source (`ProviderPlan.addons`). */
  held: ProviderAddon[]
  effectivePlan: Plan
  /** A change is being awaited — every action waits for it. */
  busy: boolean
  /** The cart a checkout is starting for (`useStartCheckout`), or null. */
  pendingCheckout: string | null
  /** Asks for `quantity` of an add-on to be paid for — 0 removes it. The parent confirms or checks out. */
  onChange: (addon: AddonCatalogueEntry, quantity: number) => void
  /** Opens the contact-form request for an add-on this deployment does not sell. */
  onRequest: (addon: AddonCatalogueEntry) => void
}

/**
 * The Plan tab's add-ons: each one's state — included in the plan, bought, granted by us —
 * and the action that changes it. Presentational: the parent owns the confirm dialog, the
 * checkout and the wait for the webhook, exactly as it does for a plan switch.
 *
 * Only the **paid** quantity is the provider's to change. An admin's grant is shown but never
 * offered for removal here, and a feature granted by us is not sold again on top.
 */
export const ProviderPlanAddons: FC<Props> = ({ addons, held, effectivePlan, busy, pendingCheckout, onChange, onRequest }) => {
  const t = useTranslations('Settings.plan')
  const format = useFormatter()

  const grantOf = (addon: AddonCatalogueEntry): ProviderAddon | undefined =>
    held.find((row) => row.addon === addon.id && row.source === ADDON_SOURCES.admin)

  const status = (addon: AddonCatalogueEntry): ReactNode => {
    if (addon.includedIn.includes(effectivePlan)) return <Tag color='green'>{t('addonIncluded')}</Tag>

    const total = heldQuantity(held, addon.id)
    if (total === 0) return null

    const grant = grantOf(addon)
    const paid = heldQuantity(held, addon.id, ADDON_SOURCES.paddle)
    return (
      <span className='flex flex-wrap gap-1'>
        <Tag color='blue'>{addon.kind === 'capacity' ? t('addonPacks', { count: total }) : t('addonActive')}</Tag>
        {grant && paid === 0 && (
          <Tag>
            {grant.expiresAt
              ? t('addonGrantedUntil', {
                  date: format.dateTime(toPlanLastDay(grant.expiresAt), { dateStyle: 'medium', timeZone: 'UTC' }),
                })
              : t('addonGranted')}
          </Tag>
        )}
      </span>
    )
  }

  const action = (addon: AddonCatalogueEntry): ReactNode => {
    if (addon.includedIn.includes(effectivePlan)) return null

    const paid = heldQuantity(held, addon.id, ADDON_SOURCES.paddle)

    if (!addon.purchasable) {
      return paid === 0 && !grantOf(addon) ? (
        <AppButton disabled={busy} onClick={() => onRequest(addon)}>
          {t('addonRequest')}
        </AppButton>
      ) : null
    }

    if (addon.kind === 'feature') {
      if (paid > 0) {
        return (
          <AppButton disabled={busy} onClick={() => onChange(addon, 0)}>
            {t('addonRemove')}
          </AppButton>
        )
      }
      // Granted by us: already in force, nothing to sell on top.
      if (grantOf(addon)) return null
      const key = checkoutKey({ addons: [{ addon: addon.id, quantity: 1 }] })
      return (
        <AppButton
          type='primary'
          disabled={busy || (pendingCheckout !== null && pendingCheckout !== key)}
          loading={pendingCheckout === key}
          onClick={() => onChange(addon, 1)}
        >
          {t('addonAdd')}
        </AppButton>
      )
    }

    const key = checkoutKey({ addons: [{ addon: addon.id, quantity: paid + 1 }] })
    return (
      <>
        {paid > 0 && (
          <AppButton icon={<MinusOutlined aria-hidden />} disabled={busy} onClick={() => onChange(addon, paid - 1)}>
            {t('addonRemovePack')}
          </AppButton>
        )}
        {paid < addon.maxQuantity && (
          <AppButton
            type={paid === 0 ? 'primary' : 'default'}
            icon={<PlusOutlined aria-hidden />}
            disabled={busy || (pendingCheckout !== null && pendingCheckout !== key)}
            loading={pendingCheckout === key}
            onClick={() => onChange(addon, paid + 1)}
          >
            {t('addonAddPack')}
          </AppButton>
        )}
      </>
    )
  }

  return <AddonCatalogue addons={addons} renderStatus={status} renderAction={action} />
}
