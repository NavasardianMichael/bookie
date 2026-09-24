import { FC } from 'react'
import { CategoryBadge } from '@app/[lang]/categories/components/CategoryBadge'
import { getTranslations } from 'next-intl/server'
import { BasicProvider } from '@store/providers/list/types'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { getProviderAvailabilityStatus, ProviderAvailabilityStatus } from '@helpers/providerAvailability'
import { FavoriteButton } from '@components/favorites/FavoriteButton'
import { RatingStars } from '@components/ui/bare/RatingStars'
import { EntityCard } from '@components/ui/EntityCard'
import { UserIcon } from '@components/ui/icons'

type Props = {
  data: BasicProvider
  /** Same as OrganizationCard: the category landing page already names the specialty. */
  hideCategories?: boolean
  /** Forwarded to EntityCard: must sit one level below the enclosing heading. */
  headingLevel?: 2 | 3 | 4
}

const STATUS_DOT: Record<ProviderAvailabilityStatus, string> = {
  available: 'bg-brand-success',
  fullyBlocked: 'bg-brand-danger',
  closed: 'bg-brand-warning',
}

/**
 * Server Component: it no longer needs antd's Image, so it stays off the client
 * bundle. The favourite heart is the one client island on it, and it hides itself on the
 * viewer's own card.
 */
export const ProviderCard: FC<Props> = async ({ data, hideCategories, headingLevel }) => {
  const { basic } = data
  const fullName = `${basic.firstName} ${basic.lastName}`
  const t = await getTranslations('Provider')
  const status = getProviderAvailabilityStatus(basic.available, basic.openToday)
  const categories = hideCategories ? [] : (basic.categories?.slice(0, 2) ?? [])
  const rating = basic.rating?.count ? basic.rating : undefined

  return (
    <EntityCard
      href={`${ROUTES.providers}/${data.id}`}
      title={fullName}
      headingLevel={headingLevel}
      subtitle={basic.organization?.basic.name}
      description={basic.description}
      image={basic.image}
      placeholder={<UserIcon className='text-brand size-16' />}
      aspect='16/9'
      mediaAction={<FavoriteButton providerId={data.id} name={fullName} />}
      mediaBadge={
        <span className='bg-surface/90 text-brand-text inline-flex items-center gap-1.5 rounded-brand-sm px-2 py-1 text-caption font-bold shadow-sm backdrop-blur-sm'>
          <span aria-hidden='true' className={cn('size-2 rounded-full', STATUS_DOT[status])} />
          {t(`cardStatus.${status}`)}
        </span>
      }
      badges={
        rating || categories.length ? (
          <>
            {/* `count`, not `average`: an unrated provider has an average of 0, and a row
                of empty stars reads as "rated badly" rather than "not rated yet".

                `RatingStars` is the antd-free display precisely so this card can stay a
                Server Component — antd's `Rate` would pull its runtime into the bundle of
                every route that renders a provider grid. */}
            {rating && (
              <span className='text-caption inline-flex items-center gap-1'>
                <RatingStars value={rating.average} size='sm' />
                <span className='tnum'>{rating.average.toFixed(1)}</span>
              </span>
            )}
            {categories.map((category) => (
              <CategoryBadge key={category.id} id={category.id} name={category.name} />
            ))}
          </>
        ) : undefined
      }
      cta='View profile'
    />
  )
}
