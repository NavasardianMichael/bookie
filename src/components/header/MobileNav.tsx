'use client'

import { FC, useCallback, useState } from 'react'
import { MenuOutlined } from '@ant-design/icons'
import { Button, Drawer } from 'antd'
import { useTranslations } from 'next-intl'
import { HEADER_CTA, HEADER_SIGN_IN } from '@constants/header'
import { ROUTES } from '@constants/routes'
import { AppLink } from '@components/ui/bare/AppLink'
import { NavLinks } from './NavLinks'

type Props = {
  isActive: (route: string) => boolean
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
export const MobileNav: FC<Props> = ({ isActive }) => {
  const t = useTranslations('Nav')
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((prev) => !prev), [])

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
          <NavLinks orientation='vertical' isActive={isActive} onNavigate={close} />
          <AppLink href={ROUTES[HEADER_SIGN_IN]} variant='button' block onClick={close}>
            {t(HEADER_SIGN_IN)}
          </AppLink>
          <AppLink href={ROUTES[HEADER_CTA]} variant='button' tone='primary' block onClick={close}>
            {t(HEADER_CTA)}
          </AppLink>
        </div>
      </Drawer>
    </>
  )
}
