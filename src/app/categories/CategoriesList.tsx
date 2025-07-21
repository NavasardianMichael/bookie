'use client'

import { useEffect } from 'react'
import { useCategoriesListStore } from '@store/categories/list/store'
import { CategoryCard } from './CategoryCard'

export const CategoriesList = () => {
  const { getCategoriesList, list } = useCategoriesListStore()

  useEffect(() => {
    getCategoriesList()
  }, [getCategoriesList])

  return (
    <div className='app-responsive-flex'>
      {list.allIds.map((categoryId) => {
        const category = list.byId[categoryId!]
        return <CategoryCard key={category.id} data={category} />
      })}
    </div>
  )
}
