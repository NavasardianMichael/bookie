'use client'

import { useEffect } from 'react'
import { useCategoriesListStore } from '@store/categories/list/store'
import { useEntityClickHandler } from '@hooks/useEntityClickHandler'
import { CategoryCard } from './CategoryCard'

export const CategoriesList = () => {
  const { getCategoriesList, list } = useCategoriesListStore()

  useEffect(() => {
    getCategoriesList()
  }, [getCategoriesList])

  const onEntityClick = useEntityClickHandler()

  return (
    <div className='app-responsive-flex'>
      {list.allIds.map((categoryId) => {
        const category = list.byId[categoryId!]
        return <CategoryCard key={category.id} data={category} onEntityClick={onEntityClick} />
      })}
    </div>
  )
}
