import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ROUTES } from '@constants/routes'

export const Header = () => {
  return (
    <header className="flex items-center p-4 gap-4  shadow-md">
      <Link href={ROUTES.home}>
        <Image className="dark:invert" src="/logo.svg" alt="Bookie logo" width={60} height={38} priority />
      </Link>
      <h1>The Easiest Platform to Book Yourself</h1>
    </header>
  )
}
