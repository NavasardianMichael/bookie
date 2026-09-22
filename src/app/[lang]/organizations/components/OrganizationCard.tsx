import { FC } from 'react'
import { CategoryBadge } from '@app/[lang]/categories/components/CategoryBadge'
import { getTranslations } from 'next-intl/server'
import { BasicOrganization } from '@store/organizations/single/types'
import { ROUTES } from '@constants/routes'
import { EntityCard } from '@components/ui/EntityCard'

type Props = {
  data: BasicOrganization
  hideCategories?: boolean
  /** Forwarded to EntityCard: must sit one level below the enclosing heading. */
  headingLevel?: 2 | 3 | 4
}

export const OrganizationCard: FC<Props> = async ({ data, hideCategories, headingLevel }) => {
  const { basic } = data
  const t = await getTranslations('Organizations')

  return (
    <EntityCard
      href={`${ROUTES.organizations}/${data.id}`}
      title={basic.name}
      description={basic.description}
      headingLevel={headingLevel}
      aspect='16/9'
      badges={
        hideCategories
          ? undefined
          : basic.categories?.slice(0, 2).map((category) => (
              <CategoryBadge key={category.id} id={category.id} name={category.name} />
            ))
      }
      cta={t('viewOrganization')}
    />
  )
}
