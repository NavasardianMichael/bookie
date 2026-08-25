'use client'

import Image from 'next/image'
import { useHeaderConfig } from '@hooks/useHeaderConfig'
import { HEADER_CTA } from '@constants/header'
import { ROUTES } from '@constants/routes'
import AppButton from '@components/ui/AppButton'
import AppLink from '@components/ui/AppLink'
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
          <AppLink href={ROUTES.home} className='flex items-center gap-2 no-underline' aria-label='Bookie home'>
            <Image src='/logo.svg' alt='' width={28} height={28} priority />
            <span className='text-h3 text-brand-text font-bold'>Bookie</span>
          </AppLink>
        )}

        {showNav && (
          <>
            <div className='ml-auto hidden items-center gap-2 md:flex'>
              <NavLinks orientation='horizontal' isActive={isActive} />
              <AppLink href={ROUTES.accountTypeSelection} className='no-underline'>
                <AppButton type='primary' size='middle'>
                  {HEADER_CTA.label}
                </AppButton>
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
