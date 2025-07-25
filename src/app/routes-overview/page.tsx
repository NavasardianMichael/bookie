import { OVERVIEW_ROUTES } from '@constants/header'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/shared/AppLink'

const RoutesOverview = () => {
  return (
    <nav className='flex flex-wrap gap-4'>
      {OVERVIEW_ROUTES.map(({ label, name }) => {
        const route = ROUTES[name!]
        return (
          <AppLink key={route} href={route} className='capitalize hover:text-blue-600 transition-colors'>
            {label}
          </AppLink>
        )
      })}
    </nav>
  )
}

export default RoutesOverview
