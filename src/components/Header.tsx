'use client'

import Image from 'next/image'
import { HEADER_ROUTES } from '@constants/header'
import { ROUTES } from '@constants/routes'
import AppLink from './shared/AppLink'

export const Header = () => {
  return (
    <>
      <input type="checkbox" id="nav-toggle" className="hidden peer" />
      <header className="flex items-center p-4 gap-4 shadow-sm relative z-20 bg-white dark:bg-gray-800">
        <AppLink href={ROUTES.home}>
          <Image className="dark:invert" src="/logo.svg" alt="Bookie logo" width={60} height={38} priority />
        </AppLink>

        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl  sm:block">Your Booking Platform Forever</h1>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-4 ml-auto">
          {HEADER_ROUTES.map(({ label, name }) => {
            return (
              <AppLink
                key={ROUTES[name]}
                href={ROUTES[name]}
                className="capitalize hover:text-blue-600 transition-colors"
              >
                {label}
              </AppLink>
            )
          })}
        </nav>

        {/* Mobile Menu Button */}
        <label htmlFor="nav-toggle" className="md:hidden ml-auto cursor-pointer p-2">
          <div className="w-6 h-5 relative flex flex-col justify-between">
            <span className="w-full h-0.5 bg-current transform transition-transform origin-right peer-checked:rotate-45"></span>
            <span className="w-full h-0.5 bg-current peer-checked:opacity-0 transition-opacity"></span>
            <span className="w-full h-0.5 bg-current transform transition-transform origin-right peer-checked:-rotate-45"></span>
          </div>
        </label>
      </header>

      {/* Mobile Menu Overlay */}
      <div className="fixed inset-0 bg-black/50 opacity-0 peer-checked:opacity-100 pointer-events-none peer-checked:pointer-events-auto transition-opacity md:hidden z-10"></div>

      {/* Mobile Navigation */}
      <nav className="fixed right-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform translate-x-full peer-checked:translate-x-0 transition-transform pt-24 md:hidden z-10">
        <div className="flex flex-col gap-4 p-4">
          {HEADER_ROUTES.map(({ label, name }) => {
            return (
              <AppLink
                key={ROUTES[name]}
                href={ROUTES[name]}
                className="capitalize hover:text-blue-600 transition-colors"
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
