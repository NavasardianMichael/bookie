'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useHeaderConfig } from '@hooks/useHeaderConfig'
import { USER_TYPES } from '@constants/auth'
import { HEADER_CTA, HEADER_SIGN_IN } from '@constants/header'
import { ROUTES } from '@constants/routes'
import { BrandLockup } from '@components/brand/BrandLockup'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'
import { Container } from '@components/ui/layout/Container'
import { BackHistoryBtn } from './BackHistoryBtn'
import { MobileNav } from './MobileNav'
import { NavLinks } from './NavLinks'

export const Header = () => {
  const t = useTranslations('Nav')
  const { showLogo, showBack, showNav, backFallback, isActive } = useHeaderConfig()
  const getMe = useAuthStore.use.getMe()
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  const firstName = useAuthStore.use.firstName()
  const lastName = useAuthStore.use.lastName()
  const image = useAuthStore.use.image()

  useEffect(() => {
    void getMe()
  }, [getMe])

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || t('account')
  const accountHref =
    userType === USER_TYPES.provider ? ROUTES.providerProfile : ROUTES.consumerProfile

  return (
    <header className='border-brand-border bg-surface/80 sticky top-0 z-50 border-b backdrop-blur-md app-safe-t'>
      <Container className='flex h-header items-center gap-3'>
        {showBack && <BackHistoryBtn fallback={backFallback} />}

        {showLogo && <BrandLockup />}

        {showNav && (
          <>
            <div className='ml-auto hidden items-center gap-8 md:flex'>
              <NavLinks orientation='horizontal' isActive={isActive} />
              {isSignedOn ? (
                <AppLink
                  href={accountHref}
                  variant='plain'
                  className='inline-flex items-center gap-3'
                  aria-label={t('accountSettings')}
                >
                  {userType === USER_TYPES.provider && (
                    <span className='hidden text-right sm:block'>
                      <AppText as='span' size='body-sm' className='block font-bold'>
                        {displayName}
                      </AppText>
                    </span>
                  )}
                  <AppAvatar src={image ?? undefined} name={displayName} size={40} />
                </AppLink>
              ) : (
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
              )}
            </div>
            <div className='ml-auto flex items-center gap-2 md:hidden'>
              {isSignedOn && (
                <AppLink href={accountHref} variant='plain' aria-label={t('accountSettings')}>
                  <AppAvatar src={image ?? undefined} name={displayName} size={36} />
                </AppLink>
              )}
              <MobileNav isActive={isActive} />
            </div>
          </>
        )}
      </Container>
    </header>
  )
}
