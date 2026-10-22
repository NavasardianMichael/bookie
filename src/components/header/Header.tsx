'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@store/auth/store'
import { useHeaderConfig } from '@hooks/useHeaderConfig'
import { USER_TYPES } from '@constants/auth'
import { type DirectoryPresence, HEADER_SIGN_IN, withAccountRoutes, withoutEmptyDirectories } from '@constants/header'
import { ROUTES } from '@constants/routes'
import { BrandLockup } from '@components/brand/BrandLockup'
import { LanguageSwitcher } from '@components/layout/LanguageSwitcher'
import { AppAvatar } from '@components/ui/AppAvatar'
import { AppLink } from '@components/ui/bare/AppLink'
import { Container } from '@components/ui/layout/Container'
import { AccountMenu } from './AccountMenu'
import { MobileNav } from './MobileNav'
import { NavLinks } from './NavLinks'

type Props = {
  directory: DirectoryPresence
}

export const Header = ({ directory }: Props) => {
  const t = useTranslations('Nav')
  const { pathname, showLogo, showNav, navRoutes, isActive } = useHeaderConfig()
  const getMe = useAuthStore.use.getMe()
  const isSignedOn = useAuthStore.use.isSignedOn()
  const userType = useAuthStore.use.userType()
  const fullName = useAuthStore.use.fullName()
  const image = useAuthStore.use.image()

  useEffect(() => {
    if (!showLogo && !showNav) return
    void getMe()
  }, [getMe, showLogo, showNav])

  const routes = withAccountRoutes(withoutEmptyDirectories(navRoutes, directory), isSignedOn)
  const displayName = fullName || t('account')
  const accountHref = userType === USER_TYPES.provider ? ROUTES.providerProfile : ROUTES.consumerProfile

  // Consumer registration hides both; an empty bar would still steal header height.
  if (!showLogo && !showNav) return null

  return (
    <header className='border-brand-border bg-surface/80 sticky top-0 z-50 border-b backdrop-blur-md app-safe-t'>
      <Container className='flex h-header items-center gap-3'>
        {showLogo && <BrandLockup />}

        {showNav && (
          <>
            <div className='ml-auto hidden items-center gap-4 xl:flex xxl:gap-6'>
              <NavLinks routes={routes} orientation='horizontal' pathname={pathname} />
              <div className='flex items-center gap-3'>
                <span aria-hidden className='bg-brand-border h-6 w-px shrink-0' />
                <LanguageSwitcher className='min-w-36 text-sm font-semibold' variant='borderless' />
                <span aria-hidden className='bg-brand-border h-6 w-px shrink-0' />
                {isSignedOn ? (
                  <AccountMenu
                    name={displayName}
                    image={image}
                    showName={userType === USER_TYPES.provider}
                    role={userType ?? USER_TYPES.consumer}
                    isActive={isActive}
                  />
                ) : (
                  <AppLink
                    href={ROUTES[HEADER_SIGN_IN]}
                    variant='plain'
                    className='inline-flex min-h-11 items-center px-4 text-sm font-semibold'
                  >
                    {t(HEADER_SIGN_IN)}
                  </AppLink>
                )}
              </div>
            </div>
            <div className='ml-auto flex items-center gap-2 xl:hidden'>
              {isSignedOn && (
                <AppLink href={accountHref} variant='unstyled' aria-label={t('accountSettings')}>
                  <AppAvatar src={image ?? undefined} name={displayName} size={36} />
                </AppLink>
              )}
              <MobileNav
                routes={routes}
                pathname={pathname}
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
