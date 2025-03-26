import Image from 'next/image'
import { HEADER_ROUTE_NAMES } from '@interfaces/header'
import { ROUTES } from '@constants/routes'
import AppLink from './shared/AppLink'

export const Header = () => {
  return (
    <header className="flex items-center p-4 gap-4  shadow-sm">
      <AppLink href={ROUTES.home}>
        <Image className="dark:invert" src="/logo.svg" alt="Bookie logo" width={60} height={38} priority />
      </AppLink>

      <h1>Your Booking Platform Forever</h1>

      <div className="flex gap-4 ml-auto ">
        {HEADER_ROUTE_NAMES.map((routeName) => {
          const route = ROUTES[routeName]
          return (
            <AppLink key={routeName} href={route} className="capitalize">
              {routeName}
            </AppLink>
          )
        })}
      </div>
    </header>
  )
}
