import { ROUTE_KEYS, ROUTES } from '@constants/routes'
import { AppRouteName } from '../interfaces/routes'

type HeaderRoute = {
  name: AppRouteName
  label: string
}

export const HEADER_ROUTES: HeaderRoute[] = [
  {
    name: 'providers',
    label: 'Providers',
  },
  {
    name: 'contact',
    label: 'Contact',
  },
  {
    name: 'routesOverview',
    label: 'Routes Overview',
  },
]

export const OVERVIEW_ROUTES: HeaderRoute[] = Object.entries(ROUTES).map(([name]) => {
  return {
    name,
    label: name,
  } as HeaderRoute
})

export const HEADER_UTILS_BY_ROUTE: Partial<Record<AppRouteName, { arrow?: boolean; logo?: boolean }>> = {
  [ROUTE_KEYS.accountTypeSelection]: {
    logo: true,
  },
  [ROUTE_KEYS.phoneNumberInput]: {
    arrow: true,
  },
}
