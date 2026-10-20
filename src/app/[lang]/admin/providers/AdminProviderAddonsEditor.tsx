'use client'

import { FC, useState } from 'react'
import { App, Checkbox, DatePicker, InputNumber } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { useFormatter, useTranslations } from 'next-intl'
import { patchAdminProviderAddonsAPI } from '@api/plans/main'
import { useErrorToast } from '@hooks/useErrorToast'
import { Addon, AddonCatalogueEntry, AddonLine, AdminProvider } from '@interfaces/plans'
import { ADDON_SOURCES } from '@constants/plans'
import { toPlanExpiryISO, toPlanLastDayValue } from '@helpers/plans'
import { AppButton } from '@components/ui/AppButton'
import { AppText } from '@components/ui/bare/AppText'

type Props = {
  provider: AdminProvider
  /** `GET /plans/addons` — what can be granted, and each one's maximum. */
  addons: AddonCatalogueEntry[]
  onSaved: (provider: AdminProvider) => void
}

/**
 * The add-ons an admin grants a provider by hand — a comp, or where Paddle does not sell
 * them: a box per feature, a count per pack, and one last day for the whole grant. Saving
 * sends the complete grant, which replaces the previous one (docs/BILLING.md → *Add-ons*).
 *
 * Only the `admin` rows are this screen's. What the provider pays for through Paddle is
 * listed beside it so a comp is not given for something already bought, and the webhook
 * never touches a grant made here.
 */
export const AdminProviderAddonsEditor: FC<Props> = ({ provider, addons, onSaved }) => {
  const t = useTranslations('Admin.providers')
  const tPlans = useTranslations('Plans')
  const format = useFormatter()
  const { message } = App.useApp()
  const showError = useErrorToast()

  const granted = provider.addons.filter((row) => row.source === ADDON_SOURCES.admin)
  const paid = provider.addons.filter((row) => row.source === ADDON_SOURCES.paddle)

  const savedQuantity = (addon: Addon): number => granted.find((row) => row.addon === addon)?.quantity ?? 0
  const savedExpiry = granted.find((row) => row.expiresAt)?.expiresAt ?? null

  const [quantities, setQuantities] = useState<Partial<Record<Addon, number>>>(() =>
    Object.fromEntries(granted.map((row) => [row.addon, row.quantity]))
  )
  const [lastDay, setLastDay] = useState<Dayjs | null>(() => (savedExpiry ? toPlanLastDayValue(savedExpiry) : null))
  const [saving, setSaving] = useState(false)

  const lines: AddonLine[] = addons
    .map(({ id }) => ({ addon: id, quantity: quantities[id] ?? 0 }))
    .filter((line) => line.quantity > 0)
  const expiresAt = lines.length && lastDay ? toPlanExpiryISO(lastDay) : null
  const dirty =
    addons.some(({ id }) => (quantities[id] ?? 0) !== savedQuantity(id)) || expiresAt !== (lines.length ? savedExpiry : null)

  const setQuantity = (addon: Addon, quantity: number): void =>
    setQuantities((current) => ({ ...current, [addon]: quantity }))

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      onSaved(await patchAdminProviderAddonsAPI({ id: provider.id, addons: lines, expiresAt }))
      void message.success(t('addonsSaved'))
    } catch (error) {
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  const paidLine = paid.length
    ? t('paidAddons', {
        addons: format.list(
          paid.map((row) => (row.quantity > 1 ? `${tPlans(`addons.${row.addon}.name`)} ×${row.quantity}` : tPlans(`addons.${row.addon}.name`))),
          { type: 'conjunction' }
        ),
      })
    : null

  return (
    <fieldset className='m-0 flex flex-col gap-3 border-0 p-0'>
      <legend className='mb-2 p-0'>
        <AppText size='caption' tone='muted'>
          {t('addonsLabel')}
        </AppText>
      </legend>

      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        {addons.map((addon) =>
          addon.kind === 'feature' ? (
            <Checkbox
              key={addon.id}
              checked={(quantities[addon.id] ?? 0) > 0}
              onChange={(event) => setQuantity(addon.id, event.target.checked ? 1 : 0)}
            >
              {tPlans(`addons.${addon.id}.name`)}
            </Checkbox>
          ) : (
            <label key={addon.id} className='flex items-center gap-2'>
              <AppText size='body-sm' tone='default'>
                {tPlans(`addons.${addon.id}.name`)}
              </AppText>
              <InputNumber
                min={0}
                max={addon.maxQuantity}
                precision={0}
                value={quantities[addon.id] ?? 0}
                onChange={(value) => setQuantity(addon.id, value ?? 0)}
                className='w-20'
              />
            </label>
          )
        )}
      </div>

      <div className='flex flex-wrap items-end gap-3'>
        <label className='flex flex-col gap-1'>
          <AppText size='caption' tone='muted'>
            {t('addonsLastDayLabel')}
          </AppText>
          <DatePicker
            value={lines.length ? lastDay : null}
            onChange={(value) => setLastDay(value)}
            disabled={!lines.length}
            disabledDate={(date) => date.isBefore(dayjs(), 'day')}
            placeholder={t('noEnd')}
            allowClear
          />
        </label>

        <AppButton type='primary' onClick={() => void save()} loading={saving} disabled={!dirty}>
          {t('saveAddons')}
        </AppButton>
      </div>

      {paidLine && (
        <AppText size='caption' tone='muted'>
          {paidLine}
        </AppText>
      )}
    </fieldset>
  )
}
