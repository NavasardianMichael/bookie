import Image from 'next/image'
import { HEADER_ROUTE_NAMES } from '@interfaces/header'
import { ROUTES } from '@constants/routes'
import AppLink from './shared/AppLink'
import Title from 'antd/es/typography/Title'

export const Header = () => {
  return (
    <header className="flex items-center p-4 gap-4  shadow-sm">
      <AppLink href={ROUTES.home}>
        <Image className="dark:invert" src="/logo.svg" alt="Bookie logo" width={60} height={38} priority />
      </AppLink>

      <Title level={1} style={{ fontSize: '1.2rem', marginBottom: 0 }}>Your Booking Platform Forever</Title>

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
