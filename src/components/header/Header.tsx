'use client'

import { useTranslations } from 'next-intl'
import { useHeaderConfig } from '@hooks/useHeaderConfig'
import { HEADER_CTA, HEADER_SIGN_IN } from '@constants/header'
import { ROUTES } from '@constants/routes'
import { BrandLockup } from '@components/brand/BrandLockup'
import { AppLink } from '@components/ui/bare/AppLink'
import { Container } from '@components/ui/layout/Container'
import { BackHistoryBtn } from './BackHistoryBtn'
import { MobileNav } from './MobileNav'
import { NavLinks } from './NavLinks'

export const Header = () => {
  const t = useTranslations('Nav')
  const { showLogo, showBack, showNav, backFallback, isActive } = useHeaderConfig()

  return (
    <header className='border-brand-border bg-surface/80 sticky top-0 z-50 border-b backdrop-blur-md app-safe-t'>
      <Container className='flex h-header items-center gap-3'>
        {showBack && <BackHistoryBtn fallback={backFallback} />}

        {showLogo && <BrandLockup />}

        {showNav && (
          <>
            <div className='ml-auto hidden items-center gap-8 md:flex'>
              <NavLinks orientation='horizontal' isActive={isActive} />
              <div className='flex items-center gap-2'>
                <AppLink
                  href={ROUTES[HEADER_SIGN_IN]}
                  variant='plain'
                  className='inline-flex min-h-11 items-center px-4 text-body-sm font-bold'
                >
                  {t(HEADER_SIGN_IN)}
                </AppLink>
                <AppLink href={ROUTES[HEADER_CTA]} variant='button' tone='primary'>
                  {t(HEADER_CTA)}
                </AppLink>
              </div>
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
