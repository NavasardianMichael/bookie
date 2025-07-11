import { HEADER_ROUTES, HEADER_UTILS_BY_ROUTE } from '@constants/header'
import { ROUTE_KEYS_BY_VALUES, ROUTES } from '@constants/routes'
import { AppRoutePath } from '@interfaces/routes'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import AppLink from '../shared/AppLink'
import { BackHistoryBtn } from './BackHistoryBtn'

export const Header = () => {
  const pathName = usePathname() as AppRoutePath
  const key = ROUTE_KEYS_BY_VALUES[pathName]
  const headerUtils = HEADER_UTILS_BY_ROUTE[key]

  return (
    <>
      <input type='checkbox' id='nav-toggle' className='hidden peer' />
      <header className='flex items-center p-4 gap-4 relative z-20 dark:bg-gray-800'>
        {headerUtils?.logo && (
          <AppLink href={ROUTES.home}>
            <Image src='/logo.svg' alt='Bookie logo' width={32} height={32} priority />
          </AppLink>
        )}

        <BackHistoryBtn />

        {/* Desktop Navigation */}
        <nav className='hidden md:flex gap-4 ml-auto'>
          {HEADER_ROUTES.map(({ label, name }) => {
            return (
              <AppLink
                key={ROUTES[name]}
                href={ROUTES[name]}
                className='capitalize hover:text-blue-600 transition-colors'
              >
                {label}
              </AppLink>
            )
          })}
        </nav>

        {/* Mobile Menu Button */}
        <label htmlFor='nav-toggle' className='md:hidden ml-auto cursor-pointer'>
          <div className='w-[20px] h-[20px] relative flex flex-col justify-between'>
            <span className='w-full h-[2px] bg-current transform transition-transform origin-right peer-checked:rotate-45'></span>
            <span className='w-full h-[2px] bg-current peer-checked:opacity-0 transition-opacity'></span>
            <span className='w-full h-[2px] bg-current transform transition-transform origin-right peer-checked:-rotate-45'></span>
          </div>
        </label>
      </header>

      {/* Mobile Menu Overlay */}
      <div className='fixed inset-0 bg-black/50 opacity-0 peer-checked:opacity-100 pointer-events-none peer-checked:pointer-events-auto transition-opacity md:hidden z-10'></div>

      {/* Mobile Navigation */}
      <nav className='fixed right-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform translate-x-full peer-checked:translate-x-0 transition-transform md:hidden z-10'>
        <div className='flex flex-col gap-4 p-4'>
          {HEADER_ROUTES.map(({ label, name }) => {
            return (
              <AppLink
                key={ROUTES[name]}
                href={ROUTES[name]}
                className='capitalize hover:text-blue-600 transition-colors'
              >
                {label}
              </AppLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}
