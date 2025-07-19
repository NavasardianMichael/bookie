import { useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { AppRoutePath } from '@interfaces/routes'
import { HEADER_ROUTES, HEADER_UTILS_BY_ROUTE } from '@constants/header'
import { ROUTE_KEYS_BY_VALUES, ROUTES } from '@constants/routes'
import { BackHistoryBtn } from './BackHistoryBtn'
import AppLink from '../shared/AppLink'

export const Header = () => {
  const pathName = usePathname() as AppRoutePath
  const key = ROUTE_KEYS_BY_VALUES[pathName!]
  const headerUtils = HEADER_UTILS_BY_ROUTE[key!]
  const navToggleRef = useRef<HTMLInputElement>(null)
  const mobileNavRef = useRef<HTMLElement>(null)

  const closeMobileNav = useCallback(() => {
    if (!navToggleRef.current) return
    navToggleRef.current.checked = false
  }, [])

  // Handle outside click to close mobile nav
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        navToggleRef.current?.checked &&
        mobileNavRef.current &&
        !mobileNavRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('label[for="nav-toggle"]')
      ) {
        closeMobileNav()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [closeMobileNav])

  return (
    <>
      <input type='checkbox' id='nav-toggle' className='hidden peer' ref={navToggleRef} />
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
            const route = ROUTES[name!]

            return (
              <AppLink key={route} href={route} className='capitalize hover:text-blue-600 transition-colors'>
                {label}
              </AppLink>
            )
          })}
        </nav>

        {/* Mobile Menu Button */}
        <label htmlFor='nav-toggle' className='md:hidden ml-auto cursor-pointer'>
          <span className='sr-only'>Open mobile navigation</span>
          <div className='w-[20px] h-[20px] relative flex flex-col justify-between'>
            <span className='w-full h-[2px] bg-current transform transition-transform origin-right peer-checked:rotate-45' />
            <span className='w-full h-[2px] bg-current peer-checked:opacity-0 transition-opacity' />
            <span className='w-full h-[2px] bg-current transform transition-transform origin-right peer-checked:-rotate-45' />
          </div>
        </label>
      </header>

      {/* Mobile Menu Overlay */}
      <div className='fixed inset-0 bg-black/50 opacity-0 peer-checked:opacity-100 pointer-events-none peer-checked:pointer-events-auto transition-opacity md:hidden z-10' />

      {/* Mobile Navigation */}
      <nav
        ref={mobileNavRef}
        className='fixed right-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform translate-x-full peer-checked:translate-x-0 transition-transform md:hidden z-10'
      >
        <div className='flex flex-col gap-4 p-4 mt-12'>
          {HEADER_ROUTES.map(({ label, name }) => {
            const route = ROUTES[name!]
            return (
              <AppLink key={route} href={route} className='capitalize hover:text-blue-600 transition-colors'>
                {label}
              </AppLink>
            )
          })}
        </div>
        {/* <CloseNavbar closeMobileNav={closeMobileNav} /> */}
      </nav>
    </>
  )
}
