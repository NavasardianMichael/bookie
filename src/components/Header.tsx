import { ROUTES } from '@constants/routes'
import Image from 'next/image'
import AppLink from './shared/AppLink'

export const Header = () => {
  return (
    <header className="flex items-center p-4 gap-4  shadow-md">
      <AppLink href={ROUTES.home} >
        <Image className="dark:invert" src="/logo.svg" alt="Bookie logo" width={60} height={38} priority />
      </AppLink>
      <h1>Your Booking Platform Forever</h1>
    </header>
  )
}
