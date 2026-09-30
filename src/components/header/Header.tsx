'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useHeaderConfig } from '@hooks/useHeaderConfig'
import { USER_TYPES } from '@constants/auth'
import { HEADER_SIGN_IN, withAccountRoutes } from '@constants/header'
import { ROUTES } from '@constants/routes'
import { BrandLockup } from '@components/brand/BrandLockup'
import { LanguageSwitcher } from '@components/layout/LanguageSwitcher'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppLink } from '@components/ui/bare/AppLink'
import { AppText } from '@components/ui/bare/AppText'
import { Container } from '@components/ui/layout/Container'
import { MobileNav } from './MobileNav'
import { NavLinks } from './NavLinks'

export const Header = () => {
  const t = useTranslations('Nav')
  const { showLogo, showNav, navRoutes, isActive } = useHeaderConfig()
  const getMe = useAuthStore.use.getMe()
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  const firstName = useAuthStore.use.firstName()
  const lastName = useAuthStore.use.lastName()
  const image = useAuthStore.use.image()

  useEffect(() => {
    if (!showLogo && !showNav) return
    void getMe()
  }, [getMe, showLogo, showNav])

  const routes = withAccountRoutes(navRoutes, isSignedOn)
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || t('account')
  const accountHref = userType === USER_TYPES.provider ? ROUTES.providerProfile : ROUTES.consumerProfile

  // Consumer registration hides both; an empty bar would still steal header height.
  if (!showLogo && !showNav) return null

  return (
    <header className='border-brand-border bg-surface/80 sticky top-0 z-50 border-b backdrop-blur-md app-safe-t'>
      <Container className='flex h-header items-center gap-3'>
        {showLogo && <BrandLockup />}

        {showNav && (
          <>
            <div className='ml-auto hidden items-center gap-4 md:flex lg:gap-6'>
              <NavLinks routes={routes} orientation='horizontal' isActive={isActive} />
              <div className='flex items-center gap-3'>
                <span aria-hidden className='bg-brand-border h-6 w-px shrink-0' />
                <LanguageSwitcher className='min-w-36 text-sm' variant='borderless' />
                <span aria-hidden className='bg-brand-border h-6 w-px shrink-0' />
                {isSignedOn ? (
                  <AppLink
                    href={accountHref}
                    variant='plain'
                    className='inline-flex items-center gap-3'
                    aria-label={t('accountSettings')}
                  >
                    {/* From `lg` only: between `md` and `lg` the name is what pushed the
                        signed-in bar past the viewport, and the avatar still names the link. */}
                    {userType === USER_TYPES.provider && (
                      <span className='hidden text-right lg:block'>
                        <AppText as='span' size='body-sm' className='block font-bold'>
                          {displayName}
                        </AppText>
                      </span>
                    )}
                    <AppAvatar src={image ?? undefined} name={displayName} size={40} />
                  </AppLink>
                ) : (
                  <AppLink
                    href={ROUTES[HEADER_SIGN_IN]}
                    variant='plain'
                    className='inline-flex min-h-11 items-center px-4 text-sm font-bold'
                  >
                    {t(HEADER_SIGN_IN)}
                  </AppLink>
                )}
              </div>
            </div>
            <div className='ml-auto flex items-center gap-2 md:hidden'>
              {isSignedOn && (
                <AppLink href={accountHref} variant='unstyled' aria-label={t('accountSettings')}>
                  <AppAvatar src={image ?? undefined} name={displayName} size={36} />
                </AppLink>
              )}
              <MobileNav
                routes={routes}
                isActive={isActive}
                isSignedOn={isSignedOn}
                profileHref={isSignedOn ? accountHref : undefined}
              />
            </div>
          </>
        )}
      </Container>
    </header>
  )
}
