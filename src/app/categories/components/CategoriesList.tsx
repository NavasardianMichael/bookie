'use client'

import { MouseEventHandler, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCategoriesListStore } from '@store/categories/list/store'
import { CategoryCard } from './CategoryCard'

export const CategoriesList = () => {
  const { push } = useRouter()
  const { getCategoriesList, list } = useCategoriesListStore()

  useEffect(() => {
    getCategoriesList()
  }, [getCategoriesList])

  const onEntityClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault()
    push(event.currentTarget.name)
  }

  return (
    <div className='app-responsive-flex'>
      {list.allIds.map((categoryId) => {
        const category = list.byId[categoryId!]
        return <CategoryCard key={category.id} data={category} onEntityClick={onEntityClick} />
      })}
    </div>
  )
}
