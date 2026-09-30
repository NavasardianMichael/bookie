'use client'

import { FC } from 'react'
import { useTranslations } from 'next-intl'
import { BasicCategory } from '@store/categories/single/types'
import { ROUTES } from '@constants/routes'
import { translateCategoryName } from '@helpers/categoryName'
import { EntityCard } from '@components/ui/EntityCard'

type Props = {
  data: BasicCategory
  /** Forwarded to EntityCard: must sit one level below the enclosing heading. */
  headingLevel?: 2 | 3 | 4
}

export const CategoryCard: FC<Props> = ({ data, headingLevel }) => {
  const t = useTranslations('Categories')
  const counts = [
    data.providers.length ? `${data.providers.length} providers` : null,
    data.organizations.length ? `${data.organizations.length} organizations` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <EntityCard
      href={`${ROUTES.categories}/${data.id}`}
      title={translateCategoryName(data.name, t)}
      headingLevel={headingLevel}
      aspect={false}
      footer={counts || 'Nothing listed yet'}
    />
  )
}
