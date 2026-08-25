import { FC } from 'react'
import { BasicOrganization } from '@store/organizations/single/types'
import { ROUTES } from '@constants/routes'
import EntityCard from '@components/ui/EntityCard'

type Props = {
  data: BasicOrganization
  hideCategories?: boolean
  /** Forwarded to EntityCard: must sit one level below the enclosing heading. */
  headingLevel?: 2 | 3 | 4
}

export const OrganizationCard: FC<Props> = ({ data, hideCategories, headingLevel }) => {
  const { basic } = data

  return (
    <EntityCard
      href={`${ROUTES.organizations}/${data.id}`}
      title={basic.name}
      description={basic.description}
      headingLevel={headingLevel}
      aspect='16/9'
      badges={
        // hideCategories used to be accepted and then silently ignored.
        // Bare spans rather than antd Tag: these are labels, not controls, and a
        // Tag would pull antd's runtime onto every list page that renders a card.
        hideCategories
          ? undefined
          : basic.categories?.slice(0, 2).map((category) => (
              <span
                key={category.id}
                className='border-brand-border text-brand-muted rounded-brand border px-1.5 py-0.5 text-caption'
              >
                {category.name}
              </span>
            ))
      }
    />
  )
}
