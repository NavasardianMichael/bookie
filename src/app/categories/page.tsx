import { CategoriesList } from './components/CategoriesList'

export const metadata = {
  title: 'Categories List',
  description: 'Categories List Page',
}

const Categories = async () => {
  return (
    <div>
      <CategoriesList />
    </div>
  )
}
export default Categories
