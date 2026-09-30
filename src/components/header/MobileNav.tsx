'use client'

import { FC, useCallback, useState } from 'react'
import { MenuOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Drawer } from 'antd'
import { useTranslations } from 'next-intl'
import { AppRouteName } from '@interfaces/routes'
import { HEADER_SIGN_IN } from '@constants/header'
import { ROUTES } from '@constants/routes'
import { cn } from '@helpers/cn'
import { LanguageSwitcher } from '@components/layout/LanguageSwitcher'
import { AppLink } from '@components/ui/bare/AppLink'
import { NavLinks } from './NavLinks'

type Props = {
  routes: AppRouteName[]
  isActive: (route: string) => boolean
  /** Hides Sign In, which would otherwise sit under Bookings and Favorites. */
  isSignedOn: boolean
  /** Settings home for the signed-in role — shown as the first drawer item. */
  profileHref?: string
}

/**
 * Replaces a CSS checkbox-hack drawer.
 *
 * That approach could not do a focus trap, scroll lock, `aria-expanded`, or focus
 * restoration on close — each of which would have been hand-written here — and
 * its hamburger animation never fired, because Tailwind's `peer-*` compiles to a
 * sibling combinator while the icon bars were descendants of the label.
 * antd's Drawer provides all of it and is already in the bundle.
 */
export const MobileNav: FC<Props> = ({ routes, isActive, isSignedOn, profileHref }) => {
  const t = useTranslations('Nav')
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  const profileActive = Boolean(profileHref && isActive(profileHref))

  return (
    <>
      <Button
        type='text'
        className='min-h-11 min-w-11 md:hidden'
        aria-label={t('openMenu')}
        aria-expanded={open}
        aria-controls='mobile-nav'
        icon={<MenuOutlined />}
        onClick={toggle}
      />
      <Drawer
        id='mobile-nav'
        title={t('menu')}
        placement='right'
        open={open}
        onClose={close}
        // Never eats the whole screen at 320px, never looks cramped on a tablet.
        size='min(20rem, 85vw)'
        rootClassName='md:hidden'
        classNames={{ body: 'p-3 overscroll-contain' }}
      >
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1'>
            {isSignedOn && profileHref && (
              <AppLink
                href={profileHref}
                variant='plain'
                onClick={close}
                aria-current={profileActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-brand-sm px-3 text-sm font-semibold transition-colors',
                  profileActive
                    ? 'bg-brand-50 text-brand'
                    : 'text-brand-text hover:bg-surface-sunken hover:text-brand active:bg-surface-sunken'
                )}
              >
                <UserOutlined aria-hidden />
                {t('profile')}
              </AppLink>
            )}
            <NavLinks routes={routes} orientation='vertical' isActive={isActive} onNavigate={close} />
          </div>
          <LanguageSwitcher className='w-full' variant='borderless' />
          {!isSignedOn && (
            <AppLink href={ROUTES[HEADER_SIGN_IN]} variant='button' block onClick={close}>
              {t(HEADER_SIGN_IN)}
            </AppLink>
          )}
        </div>
      </Drawer>
    </>
  )
}
