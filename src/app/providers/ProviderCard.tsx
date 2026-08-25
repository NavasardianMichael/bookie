import { FC } from 'react'
import { BasicProvider } from '@store/providers/list/types'
import { ROUTES } from '@constants/routes'
import EntityCard from '@components/ui/EntityCard'

type Props = {
  data: BasicProvider
  /** Forwarded to EntityCard: must sit one level below the enclosing heading. */
  headingLevel?: 2 | 3 | 4
}

/**
 * Server Component: it no longer needs antd's Image, so it stays off the client
 * bundle.
 */
export const ProviderCard: FC<Props> = ({ data, headingLevel }) => {
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
      badges={
        <span className='text-caption inline-flex items-center gap-1.5'>
          <span
            aria-hidden='true'
            className={basic.available ? 'size-2 rounded-full bg-green-500' : 'bg-brand-300 size-2 rounded-full'}
          />
          {basic.available ? 'Available' : 'Fully booked'}
        </span>
      }
    />
  )
}
