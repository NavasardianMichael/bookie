import { FC } from 'react'
import { BasicProvider } from '@store/providers/list/types'
import { ROUTES } from '@constants/routes'
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

/**
 * Server Component: it no longer needs antd's Image, so it stays off the client
 * bundle.
 */
export const ProviderCard: FC<Props> = ({ data, hideCategories, headingLevel }) => {
  const { basic } = data
  const fullName = `${basic.firstName} ${basic.lastName}`

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
      badges={
        <>
          <span className='text-caption inline-flex items-center gap-1.5'>
            <span
              aria-hidden='true'
              className={basic.available ? 'size-2 rounded-full bg-green-500' : 'bg-brand-300 size-2 rounded-full'}
            />
            {basic.available ? 'Available' : 'Fully booked'}
          </span>
          {/* `count`, not `average`: an unrated provider has an average of 0, and a row
              of empty stars reads as "rated badly" rather than "not rated yet".

              `RatingStars` is the antd-free display precisely so this card can stay a
              Server Component — antd's `Rate` would pull its runtime into the bundle of
              every route that renders a provider grid. */}
          {!!basic.rating?.count && (
            <span className='text-caption inline-flex items-center gap-1'>
              <RatingStars value={basic.rating.average} size='sm' />
              <span className='tnum'>{basic.rating.average.toFixed(1)}</span>
              <span className='text-brand-muted tnum'>({basic.rating.count})</span>
            </span>
          )}
          {!hideCategories &&
            basic.categories?.slice(0, 2).map((category) => (
              <span
                key={category.id}
                className='border-brand-border text-brand-muted rounded-brand border px-1.5 py-0.5 text-caption'
              >
                {category.name}
              </span>
            ))}
        </>
      }
      cta='View profile'
    />
  )
}
