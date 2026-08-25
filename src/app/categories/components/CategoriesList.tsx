'use client'

import { useEffect } from 'react'
import { useCategoriesListStore } from '@store/categories/list/store'
import { ResponsiveGrid } from '@components/ui/layout'
import { CategoryCard } from './CategoryCard'

export const CategoriesList = () => {
  const { getCategoriesList, list } = useCategoriesListStore()

  useEffect(() => {
    getCategoriesList()
  }, [getCategoriesList])

  return (
    <ResponsiveGrid as='ul'>
      {list.allIds.map((categoryId) => {
        const category = list.byId[categoryId!]
        return (
          <li key={category.id}>
            <CategoryCard data={category} />
          </li>
        )
      })}
    </ResponsiveGrid>
  )
}
