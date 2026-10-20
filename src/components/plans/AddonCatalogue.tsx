import { FC, ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { AddonCatalogueEntry } from '@interfaces/plans'
import { cn } from '@helpers/cn'
import { AppText } from '@components/ui/bare/AppText'
import { ResponsiveGrid } from '@components/ui/layout/ResponsiveGrid'
import { AddonPrice } from './AddonPrice'

type Props = {
  /** `GET /plans/addons`, in the API's order. */
  addons: AddonCatalogueEntry[]
  /** A tag beside the name — "Active", "Included in your plan". The Plan tab passes one; `/pricing` none. */
  renderStatus?: (addon: AddonCatalogueEntry) => ReactNode
  /** The add-on's call to action, or none. */
  renderAction?: (addon: AddonCatalogueEntry) => ReactNode
  className?: string
}

/**
 * Every add-on as a card — its name, what it adds, its monthly price and which plans already
 * include it — on `/pricing` and on the Plan tab alike, so the two never describe an add-on
 * differently. `PlanComparisonTable`'s sibling: antd-free and hook-only, so `/pricing` renders
 * it as HTML a crawler reads; only `AddonPrice` hydrates. Nothing here knows a price or a
 * step — they come from the API.
 */
export const AddonCatalogue: FC<Props> = ({ addons, renderStatus, renderAction, className }) => {
  const t = useTranslations('Plans')

  const includedLine = ({ includedIn }: AddonCatalogueEntry): string | null => {
    const [first] = includedIn
    if (!first) return null
    const plan = t(`names.${first}`)
    return includedIn.length > 1 ? t('addonIncludedFrom', { plan }) : t('addonIncludedIn', { plan })
  }

  return (
    <ResponsiveGrid as='ul' min='sm' gap='sm' className={cn('m-0 list-none p-0', className)}>
      {addons.map((addon) => {
        const included = includedLine(addon)
        return (
          <li key={addon.id} className='border-brand-border flex flex-col gap-2 rounded-brand border p-4'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <AppText as='strong' size='body' tone='default'>
                {t(`addons.${addon.id}.name`)}
              </AppText>
              {renderStatus?.(addon)}
            </div>
            <AppText size='body-sm' tone='muted'>
              {t(`addons.${addon.id}.description`, { count: addon.step ?? 1 })}
            </AppText>
            <AddonPrice addon={addon.id} price={addon.price} perPack={addon.kind === 'capacity'} />
            {included && (
              <AppText size='caption' tone='muted'>
                {included}
              </AppText>
            )}
            {renderAction && <div className='mt-auto flex flex-wrap items-center gap-2 pt-2'>{renderAction(addon)}</div>}
          </li>
        )
      })}
    </ResponsiveGrid>
  )
}
