'use client'

import Image from 'next/image'
import { useHeaderConfig } from '@hooks/useHeaderConfig'
import { HEADER_CTA } from '@constants/header'
import { ROUTES } from '@constants/routes'
import AppLink from '@components/ui/bare/AppLink'
import AppText from '@components/ui/bare/AppText'
import Container from '@components/ui/layout/Container'
import { BackHistoryBtn } from './BackHistoryBtn'
import MobileNav from './MobileNav'
import NavLinks from './NavLinks'

export const Header = () => {
  const { showLogo, showBack, showNav, backFallback, isActive } = useHeaderConfig()

  return (
    // Sticky is only possible now that the shell scrolls the document rather than
    // nesting overflow-auto containers. --header-h must match h-14.
    <header className='border-brand-border-subtle bg-surface/85 sticky top-0 z-20 border-b backdrop-blur-md app-safe-t'>
      <Container className='flex h-header items-center gap-2'>
        {showBack && <BackHistoryBtn fallback={backFallback} />}

        {showLogo && (
          <AppLink href={ROUTES.home} variant='plain' className='flex items-center gap-2' aria-label='Bookie home'>
            <Image src='/logo.svg' alt='' width={28} height={28} priority />
            <AppText tone='default' className='text-h3 font-bold'>
              Bookie
            </AppText>
          </AppLink>
        )}

        {showNav && (
          <>
            <div className='ml-auto hidden items-center gap-2 md:flex'>
              <NavLinks orientation='horizontal' isActive={isActive} />
              <AppLink href={ROUTES.accountTypeSelection} variant='button' tone='primary'>
                {HEADER_CTA.label}
              </AppLink>
            </div>
            <div className='ml-auto md:hidden'>
              <MobileNav isActive={isActive} />
            </div>
          </>
        )}
      </Container>
    </header>
  )
}
